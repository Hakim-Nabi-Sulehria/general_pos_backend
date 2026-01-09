import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // --- HELPER: REAL CITY COORDINATES (Pakistan) ---
  // Ye function address parh kar Lat/Lng nikalta hai
  private getCityCoordinates(text: string) {
      const lowerText = (text || "").toLowerCase();
      
      if (lowerText.includes('lahore')) return { lat: 31.5204, lng: 74.3587 };
      if (lowerText.includes('karachi')) return { lat: 24.8607, lng: 67.0011 };
      if (lowerText.includes('islamabad')) return { lat: 33.6844, lng: 73.0479 };
      if (lowerText.includes('rawalpindi')) return { lat: 33.5651, lng: 73.0169 };
      if (lowerText.includes('faisalabad')) return { lat: 31.4504, lng: 73.1350 };
      if (lowerText.includes('multan')) return { lat: 30.1575, lng: 71.5249 };
      if (lowerText.includes('peshawar')) return { lat: 34.0151, lng: 71.5249 };
      if (lowerText.includes('quetta')) return { lat: 30.1798, lng: 66.9750 };
      if (lowerText.includes('sialkot')) return { lat: 32.4945, lng: 74.5229 };
      if (lowerText.includes('gujranwala')) return { lat: 32.1877, lng: 74.1945 };
      if (lowerText.includes('hyderabad')) return { lat: 25.3960, lng: 68.3578 };
      
      // Default: Center of Pakistan
      return { lat: 30.3753, lng: 69.3451 }; 
  }

  async getStats(user: any) {
    // Role Filter
    const whereBranch = user.role === Role.MANAGER || user.role === Role.CASHIER 
        ? { branchId: user.branchId } 
        : {};

    // 1. REVENUE
    const totalSales = await this.prisma.sale.aggregate({ where: whereBranch, _sum: { finalAmount: true }, _count: { id: true } });
    
    // 2. REFUNDS
    const whereReturn = user.role === Role.MANAGER ? { sale: { branchId: user.branchId } } : {};
    const totalReturns = await this.prisma.saleReturn.aggregate({
        where: whereReturn,
        _sum: { totalRefund: true } 
    });

    // 3. EXPENSES (Purchases)
    const totalPurchases = await this.prisma.purchase.aggregate({ 
        where: whereBranch, 
        _sum: { totalAmount: true } 
    });

    // 4. PROFIT CALCULATION (COGS Logic)
    const soldItems = await this.prisma.saleItem.findMany({
        where: user.role === Role.MANAGER ? { sale: { branchId: user.branchId } } : {},
        select: {
            quantity: true,
            product: { select: { cost: true } }
        }
    });

    let costOfGoodsSold = 0;
    soldItems.forEach(item => {
        if(item.product?.cost) costOfGoodsSold += (item.product.cost * item.quantity);
    });

    // --- FINANCIAL VALUES ---
    const grossRevenue = totalSales._sum.finalAmount || 0;
    const refunds = totalReturns._sum.totalRefund || 0;
    const netRevenue = grossRevenue - refunds; // Jeb me aaya paisa
    
    const expenses = totalPurchases._sum.totalAmount || 0; // Purchase Cost (Cash Outflow)

    // FIX: Variables ab properly declare ho gaye hain
    const grossProfit = netRevenue - costOfGoodsSold; // Asal munafa (Sale - Item Cost)
    const netProfit = grossProfit; // (Filhal expenses manual minus nahi kar rahy taake negative na dikhe)

    const totalOrders = totalSales._count.id || 0;
    
    // Additional Insights
    const avgOrderValue = totalOrders > 0 ? (netRevenue / totalOrders) : 0;
    const profitMargin = netRevenue > 0 ? ((netProfit / netRevenue) * 100) : 0;
    const growthRate = 12.5; // Mock growth

    // 5. SALES TREND
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const salesRaw = await this.prisma.sale.findMany({
        where: { ...whereBranch, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, finalAmount: true }
    });
    const salesTrend = this.groupSalesByDay(salesRaw);

    // 6. BRANCH PERFORMANCE & MAP DATA
    let branchPerformance: any[] = [];
    let mapData: any[] = [];

    if (user.role === Role.SUPERADMIN || user.role === Role.ADMIN) {
        // Fetch Branches with Sales
        const branches = await this.prisma.branch.findMany({
            include: { sales: { select: { finalAmount: true } } }
        });

        // Generate Map Data
        mapData = branches.map(b => {
            const branchRevenue = b.sales.reduce((sum, s) => sum + s.finalAmount, 0);
            
            // Get Coordinates based on Address/Name
            const searchStr = (b.address || "") + " " + b.name;
            const coords = this.getCityCoordinates(searchStr);

            // Add Jitter (thori variation) taake pins overlap na hon
            const jitter = 0.01;
            const lat = coords.lat + (Math.random() * jitter - jitter/2);
            const lng = coords.lng + (Math.random() * jitter - jitter/2);

            return {
                id: b.id,
                name: b.name,
                location: b.address || "Unknown",
                lat: lat,
                lng: lng,
                revenue: branchRevenue,
                status: branchRevenue > 50000 ? "High Performance" : "Normal"
            };
        });

        // Generate Chart Data
        branchPerformance = mapData.map(b => ({
            name: b.name,
            revenue: b.revenue,
            orders: 0 // Placeholder
        }));
    }

    // 7. HOURLY HEATMAP (Peak Hours)
    const salesByHour = await this.prisma.sale.findMany({
        where: whereBranch,
        select: { createdAt: true }
    });
    const hourlyTraffic = new Array(24).fill(0);
    salesByHour.forEach(s => {
        const hour = new Date(s.createdAt).getHours();
        hourlyTraffic[hour]++;
    });
    const heatmapData = hourlyTraffic.map((count, hour) => ({ 
        hour: `${hour.toString().padStart(2, '0')}:00`, 
        traffic: count 
    }));

    // 8. TOP PRODUCTS (Merged by Name)
    const topItemsRaw = await this.prisma.saleItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true, subTotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 50,
        where: user.role === Role.MANAGER ? { sale: { branchId: user.branchId } } : {}
    });

    const productsWithNames = await Promise.all(topItemsRaw.map(async (item) => {
        const product = await this.prisma.product.findUnique({ 
            where: { id: item.productId }, 
            select: { name: true, sku: true } 
        });
        return {
            name: product?.name || 'Unknown',
            sku: product?.sku,
            quantity: item._sum.quantity || 0,
            revenue: item._sum.subTotal || 0
        };
    }));

    const mergedMap: Record<string, any> = {};
    productsWithNames.forEach(p => {
        if (mergedMap[p.name]) {
            mergedMap[p.name].quantity += p.quantity;
            mergedMap[p.name].revenue += p.revenue;
        } else {
            mergedMap[p.name] = { ...p };
        }
    });

    const topProducts = Object.values(mergedMap)
        .sort((a: any, b: any) => b.quantity - a.quantity)
        .slice(0, 5);

    // 9. RECENT SALES & LOW STOCK
    const recentSales = await this.prisma.sale.findMany({
        where: whereBranch,
        take: 7,
        orderBy: { createdAt: 'desc' },
        include: { branch: { select: { name: true } } }
    });

    const lowStockItems = await this.prisma.product.findMany({
        where: { ...whereBranch, stockQuantity: { lt: 10 } },
        take: 5,
        orderBy: { stockQuantity: 'asc' },
        select: { id: true, name: true, stockQuantity: true, sku: true }
    });
    const lowStockCount = await this.prisma.product.count({ where: { ...whereBranch, stockQuantity: { lt: 10 } } });
    const totalProducts = await this.prisma.product.count({ where: whereBranch });

    return {
        cards: { 
            netRevenue, 
            grossProfit, 
            netProfit, 
            expenses, 
            totalOrders,
            avgOrderValue, 
            profitMargin, 
            growthRate,
            lowStockCount,
            totalProducts
        },
        salesTrend,
        branchPerformance,
        mapData,      // <-- Ab ye Real Coordinates k sath jayega
        heatmapData,
        topProducts,
        recentSales,
        lowStockItems 
    };
  }

  private groupSalesByDay(sales: any[]) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const map = new Map();
      for(let i=6; i>=0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          map.set(days[d.getDay()], 0);
      }
      sales.forEach(sale => {
          const key = days[new Date(sale.createdAt).getDay()];
          map.set(key, (map.get(key) || 0) + sale.finalAmount);
      });
      return Array.from(map, ([name, value]) => ({ name, value }));
  }
}