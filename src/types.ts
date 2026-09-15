export type PaymentType = 'cash' | 'installment' | 'cheque'
export type BalanceType = 'debtor' | 'creditor' | 'none'

export interface Profile {
  id: string
  first_name: string
  last_name: string
  email: string
  business_name: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  parent_id: string | null
  sort_order: number
}

export interface Product {
  id: string
  user_id: string
  category_id: string | null
  name: string
  buy_price: number
  sell_price: number
  stock_qty: number
  low_stock_threshold: number
  sort_order: number
}

export interface Customer {
  id: string
  user_id: string
  first_name: string
  last_name: string
  phone: string
  address: string
  balance_type: BalanceType
  balance_amount: number
  sort_order: number
}

export interface Sale {
  id: string
  user_id: string
  customer_id: string | null
  customer_name: string
  product_id: string | null
  product_name: string
  quantity: number
  base_amount: number
  profit_percent: number
  total_amount: number
  profit_amount: number
  payment_type: PaymentType
  down_payment: number
  installment_count: number | null
  installment_interval_days: number | null
  cheque_bank_name: string | null
  cheque_number: string | null
  cheque_due_date: string | null
  sale_date: string
  sale_shamsi: string
  created_at: string
  is_cancelled?: boolean
  cancelled_at?: string | null
  quote_id?: string | null
}

export interface PaymentItem {
  id: string
  user_id: string
  sale_id: string
  type: 'installment' | 'cheque'
  sequence_no: number
  due_date: string
  amount: number
  bank_name: string | null
  cheque_number: string | null
  is_archived: boolean
  settled_at: string | null
  customer_id?: string | null
  customer_name?: string
  product_name?: string
}

export type QuoteStatus = 'pending' | 'approved'

export interface QuoteItem {
  id: string
  quote_id: string
  user_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  unit_cost: number
  line_total: number
}

export interface Quote {
  id: string
  user_id: string
  customer_id: string | null
  customer_name: string
  status: QuoteStatus
  discount_percent: number
  profit_percent: number
  subtotal: number
  total_amount: number
  quote_date: string
  quote_shamsi: string
  created_at: string
  items?: QuoteItem[]
}
