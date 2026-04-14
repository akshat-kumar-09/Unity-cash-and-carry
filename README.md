# Unity Cash & Carry

A full-featured wholesale e-commerce platform for trade customers, built with Next.js, TypeScript, Prisma, and NextAuth.js.

## Features

- 🔐 **Authentication & Authorization** - Email/password sign-in; new users create account after owner approval
- 🛍️ **Product Catalog** - Browse products with filtering by category and brand
- 🛒 **Shopping Cart** - Add products to cart with quantity management
- 📦 **Order Management** - Create and track orders with full order history
- 💾 **Database Integration** - SQLite database with Prisma ORM
- 🎨 **Modern UI** - Built with shadcn/ui components and Tailwind CSS
- 📱 **Responsive Design** - Mobile-first design optimized for all devices

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (via Prisma)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **UI Components**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm/yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd unity-cash-and-carry
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
   ```

4. **Set up the database**
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Sign in & Create account

Access is by **Sign in** (email/password). New approved users use **Create account** on the same screen to set their credentials. No shared access codes.

### Seeded accounts (after `pnpm db:seed`)
- **Admin**: admin@unitycashandcarry.com / admin123
- **Trader**: trader@example.com / trader123

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── products/     # Product CRUD
│   │   └── orders/       # Order management
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   └── ...              # Feature components
├── lib/
│   ├── prisma.ts        # Prisma client
│   ├── auth.ts          # Auth utilities
│   ├── products.ts      # Product types & utilities
│   ├── cart-context.tsx # Cart state management
│   └── validations.ts   # Zod schemas
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Database seed script
└── public/              # Static assets
```

## API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth.js handler
- `POST /api/auth/register` - User registration (create account)

### Products
- `GET /api/products` - List products (with query params: category, brand, search)
- `POST /api/products` - Create product (admin only)

### Orders
- `GET /api/orders` - List orders (user's own or all if admin)
- `POST /api/orders` - Create new order

## Database Schema

### User
- Authentication and user management
- Roles: `customer`, `admin`
- Trade codes for access control

### Product
- Product catalog with pricing
- Categories: vapes, papers, lighters, filters, accessories
- Active/inactive status

### Order
- Order management with status tracking
- Statuses: pending, confirmed, dispatched, delivered, cancelled
- VAT calculation (20%)

### OrderItem
- Individual line items in orders
- Links products to orders with quantities

## Development

### Database Commands
```bash
# Push schema changes
pnpm db:push

# Open Prisma Studio (database GUI)
pnpm db:studio

# Seed database
pnpm db:seed
```

### Building for Production
```bash
pnpm build
pnpm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Prisma database connection string | `file:./dev.db` |
| `NEXTAUTH_URL` | Base URL of your application | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret for JWT encryption | Required |
| `APP_URL` | Application URL | `http://localhost:3000` |

## Features Roadmap

- [ ] User profile management
- [ ] Order tracking and status updates
- [ ] Email notifications
- [ ] Payment integration
- [ ] Admin dashboard
- [ ] Product image uploads
- [ ] Inventory management
- [ ] Shipping address management
- [ ] Order history page
- [ ] Search improvements
- [ ] Product reviews/ratings

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For support, email support@unitycashandcarry.com or contact your account manager.
# Unity-cash-and-carry
# Unity-cash-and-carry
