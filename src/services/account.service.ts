import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AccountType } from '@prisma/client';

@Injectable()
export class AccountService {
    constructor(private prisma: PrismaService) {}

    // --- 1. BASIC SETUP ---
    async create(data: any) {
        return this.prisma.account.create({ data });
    }

    async seedDefaults() {
        const defaults = [ 
            { code: '1001', name: 'Cash in Hand', type: AccountType.CURRENT_ASSET },
            { code: '1100', name: 'Furniture & Fixtures', type: AccountType.NON_CURRENT_ASSET },
            { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY },
            { code: '3000', name: 'Owner Equity', type: AccountType.EQUITY },
            { code: '6001', name: 'Rent Expense', type: AccountType.EXPENSE },
            { code: '6002', name: 'Electricity Expense', type: AccountType.EXPENSE },
            { code: '6003', name: 'Salaries', type: AccountType.EXPENSE },
            { code: '6004', name: 'Office Maintenance', type: AccountType.EXPENSE },
        ];
        for (const acc of defaults) {
            const exists = await this.prisma.account.findUnique({ where: { code: acc.code } });
            if (!exists) await this.prisma.account.create({ data: acc });
        }
        return { message: "System Accounts Setup Complete" };
    }

    // --- 2. RECORD EXPENSE ---
    async recordExpense(data: any) {
        const { expenseAccountId, paymentAccountId, amount, description } = data;
        return this.prisma.journalEntry.create({
            data: {
                description: description || "Expense Payment",
                date: new Date(),
                transactions: {
                    create: [
                        { accountId: expenseAccountId, debit: parseFloat(amount), credit: 0 },
                        { accountId: paymentAccountId, debit: 0, credit: parseFloat(amount) }
                    ]
                }
            }
        });
    }

    // --- 3. DETAILED LEDGER (Filtered) ---
    async getAccountDetails(accountId: string, branchIdFilter: string) {
        const filter = branchIdFilter ? { branchId: branchIdFilter } : {};

        // A. SALES REVENUE (Auto)
        if (accountId === 'auto-sales') {
            const sales = await this.prisma.sale.findMany({
                where: filter,
                orderBy: { createdAt: 'desc' },
                include: { branch: true }
            });
            return {
                accountName: "Sales Revenue (Auto)",
                balance: sales.reduce((s, i) => s + i.finalAmount, 0),
                transactions: sales.map(s => ({
                    date: s.createdAt,
                    description: `Invoice #${s.invoiceNo} - ${s.customerName || 'Walk-in'} [${s.branch?.name}]`,
                    debit: 0,
                    credit: s.finalAmount,
                    ref: s.id
                }))
            };
        }

        // B. INVENTORY ASSET (Auto)
        if (accountId === 'auto-inv') {
            const adjustments = await this.prisma.inventoryAdjustment.findMany({
                where: filter,
                orderBy: { createdAt: 'desc' },
                include: { product: { select: { cost: true, name: true, sku: true } } }
            });
            
            let balance = 0; 
            const history = adjustments.map(adj => {
                const value = Math.abs(adj.quantity * adj.product.cost); 
                const isIn = adj.quantity > 0;
                if(isIn) balance += value; else balance -= value;

                return {
                    date: adj.createdAt,
                    description: `${adj.type}: ${adj.product.name} (${adj.quantity} units, SKU: ${adj.product.sku})`,
                    debit: isIn ? value : 0,
                    credit: isIn ? 0 : value,
                    ref: adj.id
                };
            });
            return { accountName: "Inventory Asset (Stock Log)", balance: balance, transactions: history };
        }

        // C. COGS (Auto)
        if (accountId === 'auto-cogs') {
            const sales = await this.prisma.sale.findMany({ 
                where: filter,
                include: { 
                    items: { include: { product: { select: { cost: true, name: true } } } } 
                } 
            });
            let transactions: any[] = [];
            let total = 0;
            
            sales.forEach(sale => {
                let cost = 0;
                let descriptionList: string[] = [];
                sale.items.forEach(item => {
                    cost += (item.quantity * item.product.cost);
                    descriptionList.push(`${item.product.name} x${item.quantity}`);
                });
                total += cost;
                transactions.push({
                    date: sale.createdAt,
                    description: `Cost for Inv #${sale.invoiceNo} (${descriptionList.join(', ')})`,
                    debit: cost,
                    credit: 0,
                    ref: sale.id
                });
            });
            return { accountName: "Cost of Goods Sold", balance: total, transactions };
        }

        // D. MANUAL ACCOUNT (GLOBAL)
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            include: { 
                transactions: { 
                    include: { journalEntry: true },
                    orderBy: { journalEntry: { date: 'desc' } }
                } 
            }
        });

        if (!account) throw new NotFoundException("Account not found");
        
        const history = account.transactions.map(t => ({
            date: t.journalEntry.date,
            description: t.journalEntry.description, 
            debit: t.debit,
            credit: t.credit,
            ref: t.journalEntryId
        }));
        
        const totalDebit = history.reduce((s, t) => s + t.debit, 0);
        const totalCredit = history.reduce((s, t) => s + t.credit, 0);
        let balance = (['CURRENT_ASSET', 'NON_CURRENT_ASSET', 'ASSET', 'EXPENSE', 'COGS'].includes(account.type)) 
                       ? totalDebit - totalCredit 
                       : totalCredit - totalDebit;

        return {
            accountName: account.name,
            code: account.code,
            type: account.type,
            balance,
            transactions: history
        };
    }

    // --- 4. FIND ALL (Chart of Accounts Summary - FILTERED) ---
    async findAll(branchIdFilter: string) {
        const liveData = await this.calculateLiveData(branchIdFilter);
        const manualAccounts = await this.getManualAccountsWithBalance(); 
        
        const expenses = manualAccounts.filter(a => a.type === 'EXPENSE');
        const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0); 

        const netProfit = liveData.totalRevenue - liveData.totalCOGS - totalExpenses;

        const purchaseFilter = branchIdFilter ? { branchId: branchIdFilter, status: false } : { status: false };
        const pendingPurchases = await this.prisma.purchase.findMany({ where: purchaseFilter });
        const totalPayables = pendingPurchases.reduce((s, p) => s + p.totalAmount, 0);

        const autoAccounts = [
            { id: 'auto-inv', code: '1200', name: 'Inventory Asset (Stock Value)', type: 'CURRENT_ASSET', balance: liveData.inventoryValue },
            { id: 'auto-ap', code: '2000', name: 'Accounts Payable (Pending Purchases)', type: 'LIABILITY', balance: totalPayables },
            { id: 'auto-re', code: '3999', name: 'Retained Earnings (Net Profit)', type: 'EQUITY', balance: netProfit },
            { id: 'auto-sales', code: '4000', name: 'Sales Revenue', type: 'INCOME', balance: liveData.totalRevenue },
            { id: 'auto-cogs', code: '5000', name: 'Cost of Goods Sold', type: 'COGS', balance: liveData.totalCOGS },
        ];

        return [...autoAccounts, ...manualAccounts].sort((a, b) => a.code.localeCompare(b.code));
    }

    // --- 5. CALCULATIONS & REPORTS (Core Helpers) ---
    private async calculateLiveData(branchIdFilter: string) {
        const productFilter = branchIdFilter ? { branchId: branchIdFilter } : {};
        
        const products = await this.prisma.product.findMany({ where: productFilter });
        const invVal = products.reduce((s, p) => s + (p.stockQuantity * p.cost), 0);

        const sales = await this.prisma.sale.findMany({ 
            where: productFilter,
            include: { items: { include: { product: { select: { cost: true, name: true, sku: true } } } } } 
        });
        
        let rev = 0;
        let cogs = 0;
        sales.forEach(s => {
            rev += s.finalAmount;
            s.items.forEach(i => cogs += (i.quantity * i.product.cost));
        });
        
        return { inventoryValue: invVal, totalRevenue: rev, totalCOGS: cogs };
    }

    private async getManualAccountsWithBalance() {
        const accounts = await this.prisma.account.findMany({ include: { transactions: true } });
        return accounts.map(acc => {
            const d = acc.transactions.reduce((s, t) => s + t.debit, 0);
            const c = acc.transactions.reduce((s, t) => s + t.credit, 0);
            let bal = (['CURRENT_ASSET', 'NON_CURRENT_ASSET', 'ASSET', 'EXPENSE', 'COGS'].includes(acc.type)) 
                       ? d - c 
                       : c - d;
            return { ...acc, balance: bal };
        });
    }

    async getProfitLoss(branchIdFilter: string) {
        const live = await this.calculateLiveData(branchIdFilter);
        const manual = await this.getManualAccountsWithBalance();
        const exp = manual.filter(a => a.type === 'EXPENSE');
        const totalExp = exp.reduce((s, a) => s + a.balance, 0);
        
        return {
            grossProfit: live.totalRevenue - live.totalCOGS,
            netProfit: (live.totalRevenue - live.totalCOGS) - totalExp,
            income: [{id: 'auto-sales', name:'Sales', balance: live.totalRevenue}],
            cogs: [{id: 'auto-cogs', name:'COGS', balance: live.totalCOGS}],
            expenses: exp,
            totalExpense: totalExp
        };
    }

    async getBalanceSheet(branchIdFilter: string) {
        const live = await this.calculateLiveData(branchIdFilter);
        const pl = await this.getProfitLoss(branchIdFilter);
        const manual = await this.getManualAccountsWithBalance();

        // --- Balance Sheet Final Merging Logic ---
        const cashFlow = live.totalRevenue - pl.totalExpense;
        const current = [
            ...manual.filter(a => a.type === 'CURRENT_ASSET'),
            { id: 'auto-inv', name: 'Inventory Stock', balance: live.inventoryValue },
            { id: 'virt-cash', name: 'Net Cash (Sales-Exp)', balance: cashFlow }
        ];
        const nonCurrent = manual.filter(a => a.type === 'NON_CURRENT_ASSET');
        
        const purchaseFilter = branchIdFilter ? { branchId: branchIdFilter, status: false } : { status: false };
        const pendingPurchases = await this.prisma.purchase.findMany({ where: purchaseFilter });
        const liabilities = [
            ...manual.filter(a => a.type === 'LIABILITY'),
            { id: 'auto-ap', name: 'Accounts Payable', balance: pendingPurchases.reduce((s,p)=>s+p.totalAmount,0) }
        ];

        const equity = manual.filter(a => a.type === 'EQUITY');
        const totalEq = equity.reduce((s,a)=>s+a.balance,0) + pl.netProfit;

        const totalA = current.reduce((s,a)=>s+a.balance,0) + nonCurrent.reduce((s,a)=>s+a.balance,0);
        const totalL = liabilities.reduce((s,a)=>s+a.balance,0);

        return {
            assets: { current, nonCurrent, total: totalA },
            liabilities: { list: liabilities, total: totalL },
            equity: { list: equity, total: totalEq, netProfit: pl.netProfit },
            summary: { 
                totalAssets: totalA, 
                totalLiabilitiesAndEquity: totalL + totalEq, 
                isBalanced: Math.abs(totalA - (totalL + totalEq)) < 0.01
            }
        };
    }

    async getCashFlow(branchIdFilter: string) {
        const live = await this.calculateLiveData(branchIdFilter);
        
        // Expense Outflows
        const expenseAccounts = await this.prisma.account.findMany({
            where: { type: 'EXPENSE' },
            include: { transactions: { include: { journalEntry: true } } }
        });

        let totalOutflowAmount = 0;
        let outflows: any[] = [];
        expenseAccounts.forEach(acc => {
            acc.transactions.forEach(t => {
                if (t.debit > 0) {
                    totalOutflowAmount += t.debit;
                    outflows.push({
                        date: t.journalEntry.date,
                        description: `${acc.name}: ${t.journalEntry.description}`,
                        amount: t.debit
                    });
                }
            });
        });

        // Detailed Inflow (Sales) 
        const totalInflowAmount = live.totalRevenue;

        // Note: For a detailed cash flow statement, we would ideally fetch the top recent sales here
        // similar to how we did for outflows, but for brevity, we are returning the aggregate.
        // If you need the list, we can add a sales fetch here.

        return {
            inflow: { total: totalInflowAmount, sales: totalInflowAmount, history: [] }, // history empty for now
            outflow: { total: totalOutflowAmount, expenses: totalOutflowAmount, history: outflows },
            netCash: totalInflowAmount - totalOutflowAmount
        };
    }
}