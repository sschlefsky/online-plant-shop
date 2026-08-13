# Online Plant Shop

A full-stack web application for an online plant shop, developed as part of the Internet Technologies course during the 4th semester of my Computer Science studies.

The application provides separate customer and employee areas with product management, shopping cart and order functionality, authentication, and real-time stock notifications.

## Technologies

- **Frontend:** Angular, TypeScript, Angular Router
- **Backend:** Node.js, Express
- **Database:** MySQL
- **Authentication:** Express Sessions
- **Real-time communication:** Socket.IO / WebSockets
- **Containerization:** Docker, Docker Compose
- **Styling:** CSS

## Features

### Customer Area

- Login and logout
- Browse available plants
- View product details
- View product recommendations
- Add products to the shopping cart
- Change quantities and remove items from the cart
- Place orders
- View personal order history
- View personal profile information

### Employee / Admin Area

- Login and logout (role-based access control)
- View and manage products
- Create, edit, and delete products
- View and edit customer data
- View and edit orders
- View change logs and filter logs by category
- View personal employee profile information

### Real-Time Functionality

- When the stock of a product falls to five or fewer items after an order, users currently viewing the corresponding product detail page receive a real-time low-stock notification.

## My Contribution 

As part of the four-person project team, I was mainly responsible for:

- Structuring the project
- Connecting the MySQL database to the application
- Navigation and footer
- Login and authentication using Express Sessions
- Multi-user functionality using WebSockets / Socket.IO

We worked collaboratively across the frontend, backend, and database layers, supporting each other throughout the development process.

For the portfolio version of this project, I additionally created a Docker-based local MySQL setup and a one-command startup script.

## Prerequisites

The following tools must be installed:

- [Node.js](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Installation and Running the Project

### 1. Clone the repository

```bash
git clone https://github.com/sschlefsky/online-plant-shop.git
cd online-plant-shop
```

### 2. Configure environment variables

Create a local `.env` file based on the provided example:

```bash
cp .env.example .env
```
For Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the complete application

```bash
npm run start:full  
```

This command automatically:

1. Starts the MySQL database using Docker Compose
2. Builds the Angular application
3. Starts the SSR server

The application will then be available at the URL shown in the terminal.