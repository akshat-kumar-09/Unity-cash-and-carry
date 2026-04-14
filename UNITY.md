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
   - An admin user: `admin@unitycashandcarry.com` / `admin123`
   - All products from the catalog

## Step 4: Start Development Server

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Step 5: Access the App

### Trade Gate Access
Use one of these codes to access the platform:
- `TRUSTANDUNITY` – Trade
- `BESTINGLASGOW` – Admin

### Admin Login
- Email: `admin@unitycashandcarry.com`
- Password: `admin123`

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

## Next Steps

- Explore the product catalog
- Add items to cart
- Place test orders
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
