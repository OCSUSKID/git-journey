# Ecommerce CRUD System

This project is a small ecommerce admin system built with Node, Express, and SQLite. It supports authentication, product CRUD, order CRUD, and a browser UI for managing everything from one page.

## What the app does

- Lets an admin sign in with a session cookie
- Lets the admin create, view, update, and delete products
- Lets the admin create, view, update, and delete orders
- Shows product and order data in a simple dashboard UI
- Stores all data in a local SQLite database file

## How the project was built

This is the sequence I used to build the app, which you can reuse for future projects of the same kind.

1. Start with a narrow scope.

	I defined the minimum ecommerce admin features first: products, orders, and login protection.

2. Create the backend first.

	I added an Express server with SQLite tables for products, orders, and users.

3. Add seed data.

	I created a seed script so the app can be started with realistic demo data right away.

4. Build the API endpoints.

	I exposed read routes publicly and protected write routes with admin authentication.

5. Add the frontend dashboard.

	I created a single-page admin UI that talks to the backend API using `fetch`.

6. Add tests.

	I wrote a test runner that checks login, protected writes, and CRUD behavior.

7. Validate the app.

	I installed dependencies, seeded the database, started the server, and confirmed the API responded.

## Project structure

- `server.js` - Express app, database setup, auth routes, product routes, and order routes
- `seed.js` - Seeds the SQLite database with sample products, a sample order, and the default admin user
- `public/index.html` - The browser dashboard UI
- `test/run-tests.js` - End-to-end API checks
- `package.json` - Project metadata and scripts
- `data.db` - Generated SQLite database file

## Setup from scratch

If you want to recreate this kind of project later, follow these steps.

1. Create a new folder for the project.

2. Initialize Node.

	Add a `package.json` with scripts for `start`, `seed`, and `test`.

3. Install dependencies.

	This project uses `express` and `sqlite3` at runtime, and `supertest`, `mocha`, and `chai` for testing support.

4. Create the backend.

	Set up Express, create the SQLite tables, and define API routes for your main resources.

5. Add authentication.

	This app uses a default admin account stored in SQLite and a session cookie named `admin_session`.

6. Add a frontend.

	The browser UI fetches from the API and sends JSON for create, update, and delete actions.

7. Add seed data.

	Seed scripts are useful because they make the project useful immediately after setup.

8. Add tests.

	Test the auth flow first, then test the create/read/update/delete flow for each resource.

## Setup in this repo

1. Install dependencies.

```bash
npm install
```

If PowerShell blocks `npm`, use:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' install
```

2. Seed demo data.

```bash
npm run seed
```

3. Start the app.

```bash
npm start
```

If you want a one-command Windows setup and launch, run:

```powershell
.\run-app.ps1
```

4. Open the app.

	Visit http://localhost:3000 in your browser.

5. Sign in.

	Use the default admin credentials below.

## Default demo admin

- Username: `admin`
- Password: `admin123`

## API overview

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/orders`
- `POST /api/orders`
- `PUT /api/orders/:id`
- `DELETE /api/orders/:id`

## Data model

The SQLite database contains three tables.

- `users` - stores the admin login with salted password hashes
- `products` - stores product catalog items
- `orders` - stores customer orders linked to products

## How authentication works

- The login route checks the username and password against the `users` table.
- On success, the server creates a random session token.
- The token is stored in memory and sent back in a cookie named `admin_session`.
- Protected write routes check that the cookie exists and that the token is valid.
- Read routes stay public so the dashboard can load data before login.

## How the frontend works

- The page loads the current auth state from `GET /api/auth/me`.
- If signed out, it shows the login form.
- After login, it hides the login form and enables the product/order actions.
- All writes send JSON to the API using `fetch`.

## How the tests work

- The test runner logs in as the default admin.
- It verifies unauthenticated writes are rejected.
- It then creates, reads, updates, and deletes products and orders.
- It finishes by logging out again.

## Troubleshooting

- If `npm install` fails in PowerShell, use `npm.cmd` as shown above.
- If the page looks empty, make sure the server is running from this folder and that you opened http://localhost:3000, not the HTML file directly.
- If writes return `401`, sign in first with the default admin credentials.
- If you want a fresh database, delete `data.db` and run `npm run seed` again.

## Suggested rebuild path for future projects

When you want to recreate a similar project from scratch, use this order:

1. Define the domain and the CRUD entities.
2. Create the folder and initialize Node.
3. Add the database schema.
4. Add seed data.
5. Build the API.
6. Add auth.
7. Build the frontend.
8. Add tests.
9. Document the setup and common issues.