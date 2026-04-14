# Setup Guide

Follow these steps to get the Unity Cash & Carry app running locally.

## Step 1: Install Dependencies

```bash
pnpm install
```

If you don't have pnpm installed:
```bash
npm install -g pnpm
```

## Step 2: Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="generate-a-random-secret-here"
   APP_URL="http://localhost:3000"
   ```

   **Important**: Generate a secure random secret for `NEXTAUTH_SECRET`. You can use:
   ```bash
   openssl rand -base64 32
   ```

## Step 3: Database Setup

1. **Push the database schema**:
   ```bash
   pnpm db:push
   ```

2. **Seed the database** with initial products and admin user:
   ```bash
   pnpm db:seed
   ```

   This will create:
   - **Admin user**: `admin@unitycashandcarry.com` / `admin123`
   - **Trader user** (retail shop owner): `trader@example.com` / `trader123`
   - All products from the catalog

## Step 4: Start Development Server

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Step 5: Access the App

### Phone-first layout & testing
The app is built phone-first (430px max width). For the most accurate preview:

1. **Chrome DevTools** (F12 → Toggle device toolbar, or Ctrl+Shift+M): Pick a phone (e.g. iPhone 14) and refresh. Scroll and tap work as on a real device.

2. **Real phone on your network**:
   - Run `pnpm dev`
   - Find your machine's IP (e.g. `ipconfig` on Windows, `ifconfig` on Mac/Linux)
   - On your phone, open `http://YOUR_IP:3000` (same Wi‑Fi required)

3. **Desktop**: The app renders in a 430px column, centered. Resize the browser to ~430px for a phone-like width.

### Sign in & Create account

The app uses email/password only. After the owner approves someone, they get the app URL and can **Create account** (same screen as Sign in) to set their own credentials, then **Sign in**.

Use these seeded credentials after `pnpm db:seed`:

| Role   | Email                         | Password   |
|--------|-------------------------------|------------|
| Admin  | `admin@unitycashandcarry.com` | `admin123` |
| Trader | `trader@example.com`          | `trader123`|

- **Admin**: Full access including product management
- **Trader**: Retail shop owner, can browse and place orders

## Troubleshooting

### Database Issues
If you encounter database errors:
1. Delete `dev.db` and `dev.db-journal` files
2. Run `pnpm db:push` again
3. Run `pnpm db:seed` again

### Port Already in Use
If port 3000 is already in use:
```bash
pnpm dev -- -p 3001
```

### Prisma Client Issues
If you see Prisma client errors:
```bash
pnpm prisma generate
```

## Adding images (brand banners & products)

### Brand banners (horizontal headers)

When a customer filters by a single brand (e.g. Higo, IVG), a horizontal banner appears above that brand’s products.

- **Where:** `public/brand-banners/`
- **Filenames:** Use the slug for each brand (see `public/brand-banners/README.md`), e.g. `higo.jpg`, `elf-bar.jpg`, `ivg.jpg`.
- **Size:** ~1200×300 px (or 4:1 ratio) works well.
- **Getting images for preview:**
  - **Placeholders:** Use any image (e.g. from [Unsplash](https://unsplash.com) search “vape”, “retail”, “product banner”) or a solid colour image, save as the right filename, and put it in `public/brand-banners/`.
  - **Real assets:** Manufacturer media kits, brand guidelines, or your own photos. Ensure you have rights to use them.

If a banner file is missing, the app shows a green gradient header instead.

### Product images (how to get images in the dashboard)

Product cards **always show an image**:
- **By default:** The app uses a placeholder image (from placehold.co) when a product has no `imageUrl`. If that fails to load, it falls back to `public/placeholder.svg`.
- **To use your own images:**
  1. **Quick preview:** Add an `imageUrl` field to your products (in the seed script or API). Use any public image URL (e.g. [Unsplash](https://unsplash.com), your CDN). For local files, put images in `public/products/` and set `imageUrl` to `/products/filename.jpg`.
  2. **Database:** Add an optional `imageUrl` column to the Product model in `prisma/schema.prisma`, run `pnpm db:push`, then update your seed or admin to set image URLs.

Example placeholder URL (used automatically when `imageUrl` is missing):  
`https://placehold.co/200x200/dbeafe/1d4ed8?text=vapes`

## Catalog built for 500+ items (wholesale)

The dashboard is designed for large catalogs (vapes and smoking accessories, no tobacco):

- **Categories:** Vapes, Papers, Lighters, Filters, Accessories.
- **Pagination:** The API returns 24 products per page (configurable). The UI shows “X of 500 products” and a **Load more** button so the list can scale to 500+ items without slowing down.
- **Adding more products:** Add rows to `prisma/seed.ts` (or use an admin/import flow), then run `pnpm db:seed` again (or run a custom script). The API supports `page` and `limit` query params (max 100 per request).

## Next Steps

- Explore the product catalog
- Add items to cart
- Place test orders
- Add brand banners and product image URLs (see above)
- Check the database with `pnpm db:studio`

## Production Deployment

Before deploying to production:

1. **Change the database** from SQLite to PostgreSQL:
   - Update `DATABASE_URL` in `.env`
   - Update `prisma/schema.prisma` datasource to `postgresql`
   - Run migrations

2. **Set secure environment variables**:
   - Use a strong `NEXTAUTH_SECRET`
   - Set proper `NEXTAUTH_URL` for your domain
   - Use environment variable management (Vercel, Railway, etc.)

3. **Build and test**:
   ```bash
   pnpm build
   pnpm start
   ```

---

## Backend, Database & POS Integration

### Where orders are stored

Orders are stored in your database via Prisma:

- **Development:** SQLite (`dev.db`) – file-based, no setup
- **Production:** Use PostgreSQL (recommended) or MySQL

**Tables:**
- `Order` – order number, customer details (name, email, phone), shipping address, subtotal, VAT, total, notes
- `OrderItem` – line items (product, quantity, unit price, total)
- `User` – created or looked up by email for guest orders

### Connecting to the backend when deploying

1. **Database**
   - Set `DATABASE_URL` to your hosted DB (e.g. Supabase, Neon, Railway, PlanetScale)
   - For PostgreSQL: `postgresql://user:pass@host:5432/dbname`
   - Run `pnpm db:push` (or migrations) to apply the schema

2. **Environment variables**
   - `DATABASE_URL` – required
   - `NEXTAUTH_URL` – your app URL (e.g. `https://yourdomain.com`)
   - `NEXTAUTH_SECRET` – secure random string

3. **Order flow**
   - Signed-in users: use the main shop and `POST /api/orders` (session-based).
   - Guest orders: `POST /api/orders/guest` with `tradeCode`, `items`, `customerName`, `customerEmail`, `customerPhone`, `shippingAddress`, `notes` (trade code validated by API).
   - A user may be found or created by email; the order is linked accordingly.

### Connecting to a POS system

If the store uses a POS (e.g. Square, Shopify POS, Lightspeed, custom):

1. **REST API**
   - Expose endpoints like `GET /api/orders` (admin-only) for the POS to fetch orders
   - Or `POST /api/orders/webhook` for the POS to push sales into your system

2. **Webhooks**
   - When an order is created, send a webhook to the POS URL (e.g. `POST https://pos.example.com/orders`)
   - Include order number, items, totals, customer details

3. **Shared database**
   - Point the POS at the same database (requires schema alignment and secure access)
   - Best when the POS supports custom DB connections

4. **Export / import**
   - Export orders as CSV or JSON (e.g. from an admin page or cron job)
   - POS imports the file on a schedule

5. **POS vendor API**
   - If the POS has an API (Square, Shopify, etc.), build a sync service that:
     - Reads orders from your DB and creates them in the POS, or
     - Reads sales from the POS and creates orders in your DB

**Example webhook (add to your order creation logic):**

```ts
// After creating order in POST /api/orders/guest
const POS_WEBHOOK_URL = process.env.POS_WEBHOOK_URL
if (POS_WEBHOOK_URL) {
  fetch(POS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderNumber: order.orderNumber,
      total: order.total,
      items: order.items,
      customer: { name: order.customerName, email: order.customerEmail },
    }),
  }).catch(console.error)
}
```
