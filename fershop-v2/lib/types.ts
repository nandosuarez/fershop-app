export type SaleMode = "immediate" | "preorder";
export type PaymentPolicy = "full_today" | "split_50_50";
export type ProductCategory = string;
export type WorkflowEventType =
  | "order"
  | "payment"
  | "purchase"
  | "notification"
  | "arrival"
  | "delivery"
  | "comment";
export type OperationalActionType = "register_purchase" | "mark_arrival" | "mark_delivery";
export type OrderStatusCode =
  | "awaiting_initial_payment"
  | "initial_payment_partial"
  | "ready_to_source"
  | "purchased_in_origin"
  | "awaiting_balance"
  | "balance_partial"
  | "ready_to_dispatch"
  | "delivered";
export type OrderSourceChannel = "whatsapp";
export type PaymentLogStatusCode = "pending" | "received";
export type NotificationStatusCode = "draft" | "sent";
export type PurchaseOrderStatusCode = "ordered" | "received";
export type ExpenseCategory =
  | "box_shipping"
  | "packaging"
  | "local_transport"
  | "marketing"
  | "operations"
  | "other";
export type ExpensePaymentSource = "shipping_fund" | "general";

export interface Product {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string;
  category: ProductCategory;
  categoryLabel: string;
  priceCop: number;
  costCop?: number;
  shippingCostCop?: number;
  pricingCalculation?: ProductPricingCalculation;
  tracksInventory?: boolean;
  saleMode: SaleMode;
  paymentPolicy: PaymentPolicy;
  badge: string;
  leadTimeLabel: string;
  description: string;
  story: string;
  materialNote: string;
  sizes: string[];
  featured?: boolean;
}

export interface ProductCategoryOption {
  id: ProductCategory;
  label: string;
}

export interface ProductPricingCalculation {
  purchasePriceUsd: number;
  taxPercent: number;
  shippingUsd: number;
  exchangeRateCop: number;
  marginPercent: number;
}

export interface CreateProductInput {
  name: string;
  imageUrl?: string;
  category: ProductCategory;
  priceCop: number;
  costCop: number;
  shippingCostCop: number;
}

export interface UpdateProductPricingInput extends ProductPricingCalculation {
  finalSalePriceCop: number;
}

export type UpdateProductInput = CreateProductInput;

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  department: string;
  postalCode?: string;
  country: string;
}

export interface CreateCustomerInput {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  department: string;
  postalCode?: string;
  country: string;
}

export type UpdateCustomerInput = CreateCustomerInput;

export interface InventoryMovement {
  id: string;
  productId: string;
  quantity: number;
  type: "purchase_receipt" | "customer_order" | "order_adjustment";
  referenceId: string;
  referenceLabel: string;
  createdAtIso: string;
}

export interface InventoryItem {
  product: Product;
  availableQuantity: number;
  totalEntries: number;
  totalExits: number;
  lastMovement?: InventoryMovement;
}

export interface PurchaseOrderLine {
  productId: string;
  productName: string;
  imageUrl?: string;
  quantity: number;
  unitCostCop: number;
  unitShippingCostCop: number;
  lineTotalCop: number;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  statusCode: PurchaseOrderStatusCode;
  statusLabel: string;
  items: PurchaseOrderLine[];
  totalUnits: number;
  totalCostCop: number;
  createdAtIso: string;
  receivedAtIso?: string;
}

export interface CreatePurchaseOrderItemInput {
  productId: string;
  quantity: number;
  unitCostCop: number;
  unitShippingCostCop: number;
}

export interface CreatePurchaseOrderInput {
  supplier: string;
  items: CreatePurchaseOrderItemInput[];
}

export interface InventorySnapshot {
  items: InventoryItem[];
  movements: InventoryMovement[];
  totalAvailableUnits: number;
  totalInventoryValueCop: number;
}

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  categoryLabel: string;
  amountCop: number;
  paymentSource: ExpensePaymentSource;
  paymentSourceLabel: string;
  expenseDate: string;
  note?: string;
  createdAtIso: string;
}

export interface CreateExpenseInput {
  description: string;
  category: ExpenseCategory;
  amountCop: number;
  paymentSource: ExpensePaymentSource;
  expenseDate: string;
  note?: string;
}

export interface ShippingFundContribution {
  id: string;
  orderId: string;
  orderCreatedAtIso: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  unitShippingCostCop: number;
  amountCop: number;
}

export interface ExpenseMetrics {
  shippingFundAccruedCop: number;
  shippingFundSpentCop: number;
  shippingFundBalanceCop: number;
  generalExpensesCop: number;
  totalExpensesCop: number;
}

export interface ExpenseSnapshot {
  expenses: Expense[];
  shippingContributions: ShippingFundContribution[];
  metrics: ExpenseMetrics;
}

export interface OrderItem {
  productId: string;
  productName: string;
  imageUrl?: string;
  quantity: number;
  unitPriceCop: number;
  unitCostCop?: number;
  unitShippingCostCop?: number;
  lineTotalCop: number;
  saleMode: SaleMode;
  paymentPolicy: PaymentPolicy;
}

export interface ComputedCartLine {
  product: Product;
  quantity: number;
  lineTotalCop: number;
  dueTodayCop: number;
  dueOnArrivalCop: number;
}

export interface CartSummary {
  lines: ComputedCartLine[];
  totalCop: number;
  dueTodayCop: number;
  dueOnArrivalCop: number;
  immediateUnits: number;
  preorderUnits: number;
}

export interface WorkflowStepBlueprint {
  key: string;
  title: string;
  owner: string;
  triggerLabel: string;
  description: string;
}

export interface OrderTimelineEvent {
  id: string;
  type: WorkflowEventType;
  title: string;
  detail: string;
  atLabel: string;
  completed: boolean;
}

export interface PaymentLogEntry {
  id: string;
  kind: "advance" | "balance";
  statusCode: PaymentLogStatusCode;
  statusLabel: string;
  amountCop: number;
  recordedAtIso?: string;
  recordedAtLabel: string;
  note: string;
}

export interface NotificationLogEntry {
  id: string;
  triggerLabel: string;
  channelLabel: string;
  statusCode: NotificationStatusCode;
  statusLabel: string;
  sentAtIso?: string;
  sentAtLabel: string;
  messagePreview: string;
}

export interface DraftOrderPreview {
  product: Product;
  quantity: number;
  totalCop: number;
  expectedDueTodayCop: number;
  expectedDueOnArrivalCop: number;
  actualInitialPaymentCop: number;
  pendingDueTodayCop: number;
  pendingDueOnArrivalCop: number;
  statusLabel: string;
  nextActionLabel: string;
  internalNote: string;
  customerMessage: string;
  operationalChecklist: string[];
}

export interface OperationalActionOption {
  type: OperationalActionType;
  label: string;
  description: string;
}

export interface OperationalPaymentOption {
  kind: "advance" | "balance";
  label: string;
  description: string;
  suggestedAmountCop: number;
}

export interface DashboardOrder {
  id: string;
  items?: OrderItem[];
  customerId?: string;
  productId: string;
  quantity: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerAddress?: string;
  customerCity: string;
  sourceChannel: OrderSourceChannel;
  productName: string;
  statusCode: OrderStatusCode;
  statusLabel: string;
  saleMode: SaleMode;
  paymentPolicy: PaymentPolicy;
  totalCop: number;
  plannedDueTodayCop: number;
  plannedDueOnArrivalCop: number;
  dueTodayCop: number;
  dueOnArrivalCop: number;
  purchaseWithoutAdvance?: boolean;
  inventoryReserved?: boolean;
  etaLabel: string;
  assignedTo: string;
  currentStageTitle: string;
  nextActionLabel: string;
  createdAtIso: string;
  updatedAtIso: string;
  purchaseRecordedAtIso?: string;
  arrivalRecordedAtIso?: string;
  deliveredAtIso?: string;
  payments: PaymentLogEntry[];
  notifications: NotificationLogEntry[];
  timeline: OrderTimelineEvent[];
}

export interface OperationsMetrics {
  activeOrders: number;
  totalOrders: number;
  pendingTodayCop: number;
  pendingArrivalCop: number;
  notificationsLogged: number;
  immediateOrders: number;
  preorderOrders: number;
  readyToSource: number;
  readyToDispatch: number;
}

export interface OperationsSnapshot {
  orders: DashboardOrder[];
  metrics: OperationsMetrics;
}

export interface CreateOrderInput {
  items: CartItem[];
  orderDate: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerAddress?: string;
  customerCity: string;
  actualInitialPaymentCop: number;
  purchaseWithoutAdvance?: boolean;
  assignedTo?: string;
}

export interface UpdateOrderItemInput extends CartItem {
  unitPriceCop: number;
}

export interface UpdateOrderInput {
  items: UpdateOrderItemInput[];
  orderDate: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerAddress?: string;
  customerCity: string;
  purchaseWithoutAdvance?: boolean;
}

export interface RegisterPaymentInput {
  kind: "advance" | "balance";
  amountCop: number;
  note?: string;
}

export interface ApplyOperationalActionInput {
  actionType: OperationalActionType;
  note?: string;
}

export interface AddOrderCommentInput {
  comment: string;
  author?: string;
}

export interface OperationMutationResult {
  order: DashboardOrder;
  internalNote: string;
  customerMessage: string;
}
