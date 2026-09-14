-- ============================================
-- اسکیمای پایگاه داده «جامع حسابداری فروشگاهی»
-- این کوئری را در Supabase SQL Editor اجرا کنید
-- ============================================

create extension if not exists "pgcrypto";

-- پروفایل هر کاربر
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  business_name text,
  created_at timestamptz default now()
);

-- دسته‌بندی کالاها (با قابلیت زیردسته از طریق parent_id)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  parent_id uuid references categories(id) on delete set null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- کالاها
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  buy_price numeric default 0,
  sell_price numeric default 0,
  stock_qty numeric default 0,
  low_stock_threshold numeric default 0,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- مشتریان و دفتر حساب‌ها
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  first_name text not null,
  last_name text default '',
  phone text default '',
  address text default '',
  balance_type text check (balance_type in ('debtor','creditor','none')) default 'none',
  balance_amount numeric default 0,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- فاکتورهای فروش
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  customer_id uuid references customers(id) on delete set null,
  customer_name text,
  product_id uuid references products(id) on delete set null,
  product_name text,
  quantity numeric default 1,
  base_amount numeric not null default 0,
  profit_percent numeric default 0,
  total_amount numeric not null default 0,
  profit_amount numeric default 0,
  payment_type text check (payment_type in ('cash','installment','cheque')) not null,
  down_payment numeric default 0,
  installment_count integer,
  installment_interval_days integer,
  cheque_bank_name text,
  cheque_number text,
  cheque_due_date date,
  sale_date date not null default current_date,
  sale_shamsi text,
  created_at timestamptz default now()
);

-- اقساط و چک‌های مربوط به هر فاکتور
create table if not exists payment_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  sale_id uuid references sales(id) on delete cascade not null,
  type text check (type in ('installment','cheque')) not null,
  sequence_no integer default 1,
  due_date date not null,
  amount numeric not null default 0,
  bank_name text,
  cheque_number text,
  is_archived boolean default false,
  settled_at timestamptz,
  created_at timestamptz default now()
);

-- فعال‌سازی امنیت سطح ردیف: هر کاربر فقط به داده‌های خودش دسترسی دارد
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table sales enable row level security;
alter table payment_items enable row level security;

create policy "profiles_self" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "categories_self" on categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "products_self" on products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "customers_self" on customers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sales_self" on sales for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "payment_items_self" on payment_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_categories_user on categories(user_id);
create index if not exists idx_products_user on products(user_id);
create index if not exists idx_customers_user on customers(user_id);
create index if not exists idx_sales_user on sales(user_id);
create index if not exists idx_sales_date on sales(sale_date);
create index if not exists idx_payment_items_user on payment_items(user_id);
create index if not exists idx_payment_items_due on payment_items(due_date);
