import type { ChartConfig } from "@/components/ui/chart"

export const dashboardStats = [
  {
    title: 'Total Revenue',
    value: '$45,231.89',
    change: '+20.1% from last month',
    icon: 'dollar-sign',
  },
  {
    title: 'Total Sales',
    value: '+12,234',
    change: '+19% from last month',
    icon: 'shopping-cart',
  },
  {
    title: 'Profit Margin',
    value: '25.6%',
    change: '+2.1% from last month',
    icon: 'percent',
  },
  {
    title: 'Active Orders',
    value: '573',
    change: '+201 since last hour',
    icon: 'activity',
  },
];

export const shopProducts = [
    { id: 'prod-01', name: 'Premium Wheat Seeds', description: 'High-yield, disease-resistant wheat seeds.', price: 25.99, category: 'Seeds', imageId: 'shop-seeds', quantity: 500, unit: 'kg' },
    { id: 'prod-02', name: 'All-Purpose Fertilizer', description: 'NPK balanced fertilizer for all crops.', price: 45.50, category: 'Fertilizers', imageId: 'shop-fertilizer', quantity: 200, unit: 'bags' },
    { id: 'prod-03', name: 'FarmHand Tractor', description: '45 HP tractor for small to medium farms.', price: 15000.00, category: 'Heavy Machinery', imageId: 'shop-tractor', quantity: 5, unit: 'units' },
    { id: 'prod-04', name: 'Gardening Tool Set', description: 'Includes trowel, fork, and cultivator.', price: 19.99, category: 'Tools', imageId: 'shop-tools', quantity: 150, unit: 'units' },
    { id: 'prod-05', name: 'Organic Pesticide', description: 'Neem-based organic pest control.', price: 32.00, category: 'Pesticides', imageId: 'shop-fertilizer', quantity: 120, unit: 'liters' },
    { id: 'prod-06', name: 'Hybrid Corn Seeds', description: 'High-yield hybrid corn seeds.', price: 35.99, category: 'Seeds', imageId: 'shop-seeds', quantity: 50, unit: 'kg' }
];

export const marketplaceCrops = [
    { id: 'crop-01', cropName: 'Organic Wheat', qualityGrade: 'Premium', certifications: 'Organic Certified', wholesalePrice: 0.8, retailPrice: 1.2, wholesaleQuantity: 5000, retailQuantity: 500, unit: 'kg', imageId: 'market-wheat' },
    { id: 'crop-02', cropName: 'Sweet Corn', qualityGrade: 'Grade A', certifications: 'Non-GMO', wholesalePrice: 0.5, retailPrice: 0.8, wholesaleQuantity: 10000, retailQuantity: 1000, unit: 'cob', imageId: 'market-corn' },
    { id: 'crop-03', cropName: 'Roma Tomatoes', qualityGrade: 'Standard', certifications: 'None', wholesalePrice: 1.1, retailPrice: 1.5, wholesaleQuantity: 2000, retailQuantity: 200, unit: 'kg', imageId: 'market-tomatoes' },
    { id: 'crop-04', cropName: 'Baby Carrots', qualityGrade: 'Premium', certifications: 'Organic Certified', wholesalePrice: 1.5, retailPrice: 2.0, wholesaleQuantity: 1500, retailQuantity: 150, unit: 'kg', imageId: 'market-carrots' }
];

export const sampleOrders = [
    { id: 'order-01', userId: '', orderDate: new Date(2024, 0, 15).toISOString(), totalAmount: 71.49, status: 'Delivered', shippingAddress: '123 Farm Rd, Greenland', billingAddress: '123 Farm Rd, Greenland' },
    { id: 'order-02', userId: '', orderDate: new Date(2024, 1, 20).toISOString(), totalAmount: 15000.00, status: 'Shipped', shippingAddress: '123 Farm Rd, Greenland', billingAddress: '123 Farm Rd, Greenland' },
    { id: 'order-03', userId: '', orderDate: new Date(2024, 2, 5).toISOString(), totalAmount: 19.99, status: 'Processing', shippingAddress: '123 Farm Rd, Greenland', billingAddress: '123 Farm Rd, Greenland' },
    { id: 'order-04', userId: '', orderDate: new Date(2024, 3, 10).toISOString(), totalAmount: 32.00, status: 'Delivered', shippingAddress: '123 Farm Rd, Greenland', billingAddress: '123 Farm Rd, Greenland' },
    { id: 'order-05', userId: '', orderDate: new Date(2024, 4, 21).toISOString(), totalAmount: 35.99, status: 'Delivered', shippingAddress: '123 Farm Rd, Greenland', billingAddress: '123 Farm Rd, Greenland' },
];

export const sampleTransactions = [
    { id: 'tran-01', userId: '', transactionDate: new Date(2024, 0, 15).toISOString(), transactionType: 'Purchase', amount: 71.49, description: 'Order order-01' },
    { id: 'tran-02', userId: '', transactionDate: new Date(2024, 1, 20).toISOString(), transactionType: 'Purchase', amount: 15000.00, description: 'Order order-02' },
    { id: 'tran-03', userId: '', transactionDate: new Date(2024, 2, 5).toISOString(), transactionType: 'Purchase', amount: 19.99, description: 'Order order-03' },
    { id: 'tran-04', userId: '', transactionDate: new Date(2024, 2, 15).toISOString(), transactionType: 'Sale', amount: 4000.00, description: 'Sale of Organic Wheat' },
    { id: 'tran-05', userId: '', transactionDate: new Date(2024, 3, 10).toISOString(), transactionType: 'Purchase', amount: 32.00, description: 'Order order-04' },
    { id: 'tran-06', userId: '', transactionDate: new Date(2024, 4, 1).toISOString(), transactionType: 'Sale', amount: 5000.00, description: 'Sale of Sweet Corn' },
    { id: 'tran-07', userId: '', transactionDate: new Date(2024, 4, 21).toISOString(), transactionType: 'Purchase', amount: 35.99, description: 'Order order-05' },
];
