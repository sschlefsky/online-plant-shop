import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import 'dotenv/config';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';
import { createConnection, ResultSetHeader, RowDataPacket } from 'mysql2';
import session from 'express-session';
import { OkPacket } from 'mysql';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');
const app = express();

type User = {
  user_id: number;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
};

declare module "express-session" {
  interface SessionData {
    user?: User;
  }
}

const sessionSecret = process.env['SESSION_SECRET'];

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is not configured.');
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60
  }
}));

app.use(express.json());
const commonEngine = new CommonEngine();

const dbConfig = {
  host: process.env['DB_HOST'] || 'localhost',
  port: Number(process.env['DB_PORT'] || 3306),
  database: process.env['DB_NAME'],
  user: process.env['DB_USER'],
  password: process.env['DB_PASSWORD']
};

if (!dbConfig.database || !dbConfig.user || !dbConfig.password) {
  throw new Error('Database environment variables are not configured.');
}

app.post('/api/cart/add', (req, res) => {
  const { customer_id, product_id, quantity, price } = req.body;

  if (!customer_id || !product_id || !quantity || !price) {
    return res.status(400).json({ message: 'Fehlende Angaben' });
  }

  const con = createConnection(dbConfig);

  con.connect(err => {
    if (err) {
      return res.status(500).json({ message: 'Datenbankverbindung fehlgeschlagen' });
    }

    con.query(
      'SELECT cart_id FROM Cart WHERE customer_id = ?',
      [customer_id],
      (err, results) => {
        if (err) {
          con.end();
          return res.status(500).json({ message: 'Fehler beim Abrufen des Warenkorbs' });
        }

        const carts = results as RowDataPacket[];

        if (carts.length === 0) {
          con.end();
          return res.status(404).json({ message: 'Kein Warenkorb gefunden' });
        }

        const cart_id = carts[0]['cart_id'];
        const unit_price = price / quantity;

        con.query(
          'SELECT quantity FROM Cart_Item WHERE cart_id = ? AND product_id = ?',
          [cart_id, product_id],
          (err, itemResult) => {
            if (err) {
              con.end();
              return res.status(500).json({ message: 'Fehler beim Prüfen des Warenkorbs' });
            }

            const items = itemResult as RowDataPacket[];

            if (items.length > 0) {
              const existingQuantity = items[0]['quantity'];
              const newQuantity = existingQuantity + quantity;
              const newTotalPrice = newQuantity * unit_price;

              if (newQuantity <= 0) {
                con.query(
                  'DELETE FROM Cart_Item WHERE cart_id = ? AND product_id = ?',
                  [cart_id, product_id],
                  err => {
                    if (err) {
                      con.end();
                      return res.status(500).json({ message: 'Fehler beim Löschen des Artikels' });
                    }
                    return updateCartTotal(con, cart_id, res);
                  }
                );
                return;
              }

              con.query(
                'UPDATE Cart_Item SET quantity = ?, price = ? WHERE cart_id = ? AND product_id = ?',
                [newQuantity, newTotalPrice, cart_id, product_id],
                err => {
                  if (err) {
                    con.end();
                    return res.status(500).json({ message: 'Fehler beim Aktualisieren des Artikels' });
                  }
                  return updateCartTotal(con, cart_id, res);
                }
              );
              return;
            } else {
              con.query(
                'INSERT INTO Cart_Item (cart_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [cart_id, product_id, quantity, price],
                err => {
                  if (err) {
                    con.end();
                    return res.status(500).json({ message: 'Fehler beim Hinzufügen des Artikels' });
                  }
                  return updateCartTotal(con, cart_id, res);
                }
              );
              return;
            }
          }
        );
        return;
      }
    );
    return;
  });

  return;
});

function updateCartTotal(con: ReturnType<typeof createConnection>, cart_id: number, res: express.Response) {
  return con.query(
    `UPDATE Cart
     SET total_price = (SELECT IFNULL(SUM(price), 0)
                        FROM Cart_Item
                        WHERE cart_id = ?)
     WHERE cart_id = ?`,
    [cart_id, cart_id],
    err => {
      con.end();

      if (err) {
        return res.status(500).json({ message: 'Fehler beim Aktualisieren des Gesamtpreises' });
      }

      return res.status(201).json({ message: 'Artikel hinzugefügt oder aktualisiert' });
    }
  );
}

app.post('/api/cart/clear', (req, res) => {
  const { customer_id } = req.body;

  if (!customer_id) {
    return res.status(400).json({ message: 'Fehlende customer_id' });
  }

  const con = createConnection(dbConfig);

  con.connect(err => {
    if (err) {
      return res.status(500).json({ message: 'Datenbankverbindung fehlgeschlagen' });
    }

    return con.query(
      'SELECT cart_id FROM Cart WHERE customer_id = ?',
      [customer_id],
      (err, results) => {
        if (err) {
          con.end();
          return res.status(500).json({ message: 'Fehler beim Abrufen des Warenkorbs' });
        }

        const carts = results as RowDataPacket[];

        if (carts.length === 0) {
          con.end();
          return res.status(404).json({ message: 'Kein Warenkorb gefunden' });
        }

        const cart_id = carts[0]['cart_id'];

        return con.query(
          'DELETE FROM Cart_Item WHERE cart_id = ?',
          [cart_id],
          (err, result) => {
            if (err) {
              con.end();
              return res.status(500).json({ message: 'Fehler beim Leeren des Warenkorbs' });
            }

            const deleteResult = result as OkPacket;

            if (deleteResult.affectedRows === 0) {
              console.log('Warenkorb war bereits leer');
            }

            return con.query(
              'UPDATE Cart SET total_price = 0 WHERE cart_id = ?',
              [cart_id],
              (err, result) => {
                con.end();

                if (err) {
                  return res.status(500).json({ message: 'Fehler beim Aktualisieren des Gesamtpreises' });
                }

                return res.status(200).json({ message: 'Warenkorb geleert' });
              }
            );
            return;
          }
        );
        return;
      }
    );
    return;
  });
  return;
});

app.get('/api/get-cart', (req, res) => {
  const sessionUser = req.session.user;

  if (!sessionUser || sessionUser.role !== 'customer') {
    return res.status(401).json({ message: 'Nicht autorisiert' });
  }

  const customer_id = sessionUser.user_id;
  const con = createConnection(dbConfig);

  con.connect(err => {
    if (err) {
      return res.status(500).json({ message: 'Datenbankverbindung fehlgeschlagen' });
    }


    return con.query(
      'SELECT cart_id FROM Cart WHERE customer_id = ?',
      [customer_id],
      (err, results) => {
        if (err) {
          con.end();
          return res.status(500).json({ message: 'Fehler beim Abrufen des Warenkorbs' });
        }

        const cartId = (results as RowDataPacket[])[0]['cart_id'];

        const sql = `
          SELECT ci.product_id,
                 p.name,
                 p.description,
                 p.image,
                 ci.quantity,
                 ci.price,
                 c.total_price
          FROM Cart_Item ci
                 LEFT JOIN Product p ON ci.product_id = p.product_id
                 INNER JOIN Cart c ON ci.cart_id = c.cart_id
          WHERE ci.cart_id = ?
        `;

        return con.query(sql, [cartId], (err, results) => {
          if (err) {
            con.end();
            return res.status(500).json({ message: 'Fehler beim Laden der Warenkorbdaten' });
          }

          const items = results as RowDataPacket[];

          const total_price = items.length > 0 ? items[0]['total_price'] : 0;

          con.end();
          res.json({
            cart_id: cartId,
            items,
            total_price
          });
          return;
        });
      }
    );
  });
  return;
});

app.get('/api/get-products', (req, res) => {
  console.log("Anfrage angekommen");
  const con = createConnection(dbConfig);

  con.connect(function (err) {
    if (err) throw err;
    console.log("connected to db");
    con.query("SELECT * from Product", function (error, result, fields) {
      res.send(result);
      con.end(function (err) {
      });
    });
  });
});

app.post('/api/products', async (req, res) => {
  const user = req.session.user;

  if (!user || user.role !== 'employee') {
    return res.status(403).json({ message: 'Nur Mitarbeiter dürfen Produkte erstellen' });
  }

  const { name, description, price, stock_quantity, image } = req.body;

  if (!name || price === undefined || stock_quantity === undefined || !description || !image) {
    return res.status(400).json({ message: 'Fehlende Pflichtfelder (name, price, stock_quantity, description, image)' });
  }

  const con = createConnection(dbConfig).promise();

  try {
    await con.connect();

    const [insertResult] = await con.query(
      'INSERT INTO Product (name, description, price, stock_quantity, image) VALUES (?, ?, ?, ?, ?)',
      [name, description, price, stock_quantity, image]
    );

    const insertedId = (insertResult as OkPacket).insertId;

    const fieldsToLog = [
      { field: 'name', value: name },
      { field: 'description', value: description },
      { field: 'price', value: price },
      { field: 'stock_quantity', value: stock_quantity },
      { field: 'image', value: image }
    ];

    const logPromises = fieldsToLog.map(field =>
      con.query(
        'INSERT INTO Product_Change (employee_id, product_id, field_changed, change_date, field_before, field_after) VALUES (?, ?, ?, CURDATE(), NULL, ?)',
        [user.user_id, insertedId, field.field, field.value]
      )
    );

    await Promise.all(logPromises);

    await con.end();

    return res.status(201).json({
      message: 'Produkt erfolgreich erstellt',
      product_id: insertedId,
      logs_created: fieldsToLog.length
    });
  } catch (error: any) {
    await con.end();
    console.error('Fehler beim Erstellen des Produkts:', error);
    return res.status(500).json({
      message: 'Fehler beim Erstellen des Produkts',
      error: error.message
    });
  }
});

app.post('/api/cart/checkout', (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'customer') {
    return res.status(401).json({ message: 'Nicht autorisiert' });
  }

  const con = createConnection(dbConfig);

  con.connect(err => {
    if (err) return res.status(500).json({ message: 'DB‑Verbindung fehlgeschlagen' });

    con.beginTransaction(err => {
      if (err) {
        con.end();
        return res.status(500).json({ message: 'Transaktionsfehler' });
      }

      con.query(
        `SELECT cart_id, total_price FROM Cart WHERE customer_id = ?`,
        [user.user_id],
        (err, results) => {
          if (err) return rollback('Fehler beim Lesen des Warenkorbs');

          const cartRows = results as any[];
          if (!cartRows.length || cartRows[0]['total_price'] === 0) {
            return rollback('Warenkorb leer', 400);
          }

          const cart_id = cartRows[0]['cart_id'];
          const total_price = cartRows[0]['total_price'];

          con.query(
            `INSERT INTO Customer_Order
               (customer_id, date, delivery_status, total_price, payment_method)
             VALUES (?, CURDATE(), 'open', ?, 'invoice')`,
            [user.user_id, total_price],
            (err, results) => {
              if (err) return rollback('Fehler beim Anlegen der Bestellung');

              const order_id = (results as any).insertId;

              con.query(
                `INSERT INTO Order_Item
                   (order_id, product_id, quantity, price)
                 SELECT ?, product_id, quantity, price
                 FROM Cart_Item
                 WHERE cart_id = ?`,
                [order_id, cart_id],
                err => {
                  if (err) return rollback('Fehler beim Kopieren der Positionen');

                  con.query(
                    `DELETE FROM Cart_Item WHERE cart_id = ?`,
                    [cart_id],
                    err => {
                      if (err) return rollback('Fehler beim Leeren des Warenkorbs');

                      con.query(
                        `UPDATE Cart SET total_price = 0 WHERE cart_id = ?`,
                        [cart_id],
                        err => {
                          if (err) return rollback('Fehler beim Zurücksetzen des Warenkorbs');

                          con.query(
                            `SELECT product_id, quantity FROM Order_Item WHERE order_id = ?`,
                            [order_id],
                            (err, results) => {
                              if (err) {
                                con.end();
                                return res.status(201).json({
                                  message: 'Bestellung erfolgreich erstellt (Warnung: Bestand konnte nicht geprüft werden)',
                                  order_id
                                });
                              }

                              const orderItems = results as any[];
                              if (orderItems.length === 0) {
                                con.end();
                                return res.status(201).json({
                                  message: 'Bestellung erfolgreich erstellt',
                                  order_id
                                });
                              }

                              const io = req.app.get('io');
                              let checked = 0;
                              let hasError = false;

                              for (const item of orderItems) {

                                con.query(
                                  `UPDATE Product SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND stock_quantity >= ?`,
                                  [item.quantity, item.product_id, item.quantity],
                                  (err, result) => {
                                    const updateResult = result as { affectedRows: number };
                                    if (err || updateResult.affectedRows === 0) {
                                      hasError = true;
                                      return rollback('Nicht genügend Bestand für Produkt ' + item.product_id, 400);
                                    }

                                    con.query(
                                      `SELECT stock_quantity FROM Product WHERE product_id = ?`,
                                      [item.product_id],
                                      (err, results) => {
                                        const stockRows = results as any[];
                                        if (!err && stockRows.length > 0) {
                                          const stock = stockRows[0].stock_quantity;
                                          if (stock <= 5) {
                                            console.log('LowStock-Event wird gesendet für Produkt', item.product_id, 'Bestand:', stock);
                                            io.emit('lowStock', {
                                              product_id: item.product_id,
                                              stock: stock
                                            });
                                          }
                                        }
                                        checked++;

                                        if (checked === orderItems.length && !hasError) {
                                          con.commit(err => {
                                            con.end();
                                            if (err) {
                                              return res.status(500).json({ message: 'Commit‑Fehler' });
                                            }
                                            return res.status(201).json({
                                              message: 'Bestellung erfolgreich erstellt',
                                              order_id
                                            });
                                          });
                                        }
                                      }
                                    );
                                  }
                                );
                              }
                              return;
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );

      function rollback(msg: string, code = 500) {
        con.rollback(() => {
          con.end();
          res.status(code).json({ message: msg });
        });
      }
      return;
    });
    return;
  });
  return;
});




app.get('/api/get-my-orders', (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'customer') {
    return res.status(401).json({ message: 'Nicht autorisiert' });
  }

  const con = createConnection(dbConfig);
  con.connect(err => {
    if (err) {
      return res.status(500).send("DB connection error");
    }

    const sql = `
      SELECT *
      FROM Customer_Order
      WHERE customer_id = ?
      ORDER BY order_id DESC
    `;

    con.query(sql, [user.user_id], (error, results) => {
      if (error) {
        res.status(500).send(error);
      } else {
        res.send(results);
      }
      con.end();
    });
    return;
  });
  return;
});

app.get('/api/get-product/:id', (req, res) => {
  const productId = req.params.id;

  const con = createConnection(dbConfig);

  con.connect(function (err) {
    if (err) {
      console.error('DB-Verbindung fehlgeschlagen:', err);
      res.status(500).send('Datenbankfehler');
      return;
    }
    console.log("connected to db");

    con.query(
      "SELECT * FROM Product WHERE product_id = ?",
      [productId],
      function (error, results, fields) {
        if (error) {
          console.error('Fehler bei der Abfrage:', error);
          res.status(500).send('Abfragefehler');
        } else {
          if (Array.isArray(results) && results.length === 0) {
            res.status(404).send('Produkt nicht gefunden');
          } else if (Array.isArray(results)) {
            res.send(results[0]);
          } else {
            res.status(500).send('Unerwartetes Ergebnis');
          }
        }
        con.end();
      }
    );

  });
});

app.put('/api/edit-product', async (req, res) => {
  const user = req.session.user;

  if (!user || user.role !== 'employee') {
    return res.status(403).json({ message: 'Nur Mitarbeiter dürfen Produkte bearbeiten' });
  }

  const { product_id, name, description, price, stock_quantity, image } = req.body;

  if (!product_id || !name || price === undefined || stock_quantity === undefined || !description || !image) {
    return res.status(400).json({ message: 'Fehlende Pflichtfelder (product_id, name, price, stock_quantity, description, image)' });
  }

  const con = createConnection(dbConfig).promise();

  try {
    await con.connect();

    const [currentProductRows] = await con.query<RowDataPacket[]>(
      'SELECT name, description, price, stock_quantity, image FROM Product WHERE product_id = ?',
      [product_id]
    );

    if (currentProductRows.length === 0) {
      await con.end();
      return res.status(404).json({ message: 'Produkt nicht gefunden' });
    }

    const oldValues = currentProductRows[0];
    const changes = [];

    if (oldValues['name'] !== name) {
      changes.push({ field: 'name', before: oldValues['name'], after: name });
    }
    if (oldValues['description'] !== description) {
      changes.push({ field: 'description', before: oldValues['description'], after: description });
    }
    if (oldValues['price'] !== price) {
      changes.push({ field: 'price', before: oldValues['price'], after: price });
    }
    if (oldValues['stock_quantity'] !== stock_quantity) {
      changes.push({ field: 'stock_quantity', before: oldValues['stock_quantity'], after: stock_quantity });
    }
    if (oldValues['image'] !== image) {
      changes.push({ field: 'image', before: oldValues['image'], after: image });
    }

    await con.query(
      'UPDATE Product SET name = ?, description = ?, price = ?, stock_quantity = ?, image = ? WHERE product_id = ?',
      [name, description, price, stock_quantity, image, product_id]
    );

    if (changes.length > 0) {
      const changePromises = changes.map(change =>
        con.query(
          'INSERT INTO Product_Change (employee_id, product_id, field_changed, change_date, field_before, field_after) VALUES (?, ?, ?, CURDATE(), ?, ?)',
          [user.user_id, product_id, change.field, change.before, change.after]
        )
      );
      await Promise.all(changePromises);
    }

    await con.end();
    return res.status(200).json({ message: 'Produkt erfolgreich aktualisiert', changes_made: changes.length > 0 });
  } catch (error: any) {
    await con.end();
    console.error('Fehler beim Aktualisieren des Produkts:', error);
    return res.status(500).json({ message: 'Fehler beim Aktualisieren des Produkts', error: error.message });
  }
});

app.delete('/api/delete-product/:id', async (req, res) => {
  const user = req.session.user;

  if (!user || user.role !== 'employee') {
    return res.status(403).json({ message: 'Nur Mitarbeiter dürfen Produkte löschen' });
  }

  const productId = req.params.id;

  if (!productId || isNaN(Number(productId))) {
    return res.status(400).json({ message: 'Ungültige Produkt-ID' });
  }

  const con = createConnection(dbConfig).promise();

  try {
    await con.connect();

    const [productRows] = await con.query<RowDataPacket[]>(
      'SELECT * FROM Product WHERE product_id = ?',
      [productId]
    );

    if (productRows.length === 0) {
      await con.end();
      return res.status(404).json({ message: 'Produkt nicht gefunden' });
    }

    const product = productRows[0];

    await con.query(
      'INSERT INTO Product_Change (employee_id, product_id, field_changed, change_date, field_before, field_after) VALUES (?, ?, ?, CURDATE(), ?, NULL)',
      [user.user_id, productId, 'product_deleted', JSON.stringify(product)]
    );

    await con.query(
      'DELETE FROM Product WHERE product_id = ?',
      [productId]
    );

    await con.end();

    return res.status(200).json({
      message: 'Produkt erfolgreich gelöscht',
      deleted_product: product
    });
  } catch (error: any) {
    await con.end();
    console.error('Fehler beim Löschen des Produkts:', error);
    return res.status(500).json({
      message: 'Fehler beim Löschen des Produkts',
      error: error.message
    });
  }
});

app.get('/api/get-customers', async (req, res) => {
  const con = createConnection(dbConfig).promise();

  try {
    await con.connect();

    const [customers] = await con.query<RowDataPacket[]>(`
      SELECT u.user_id AS customer_id,
             u.first_name,
             u.last_name,
             u.email,
             a.street,
             a.house_number,
             a.zipcode,
             a.country,
             a.city
      FROM Customer c
             JOIN User u ON c.customer_id = u.user_id
             LEFT JOIN Address a ON u.address_id = a.address_id
    `);

    res.status(200).json(customers);
  } catch (error: any) {
    console.error('Fehler beim Laden der Kunden:', error);
    res.status(500).json({
      message: 'Fehler beim Laden der Kunden',
      error: error.message
    });
  } finally {
    await con.end();
  }
});

app.get('/api/get-customer/:id', async (req, res) => {
  const customer_id = req.params.id;
  const con = createConnection(dbConfig).promise();
  try {
    await con.connect();
    const [currentCustomerAttributes] = await con.query<RowDataPacket[]>(
      `SELECT u.user_id,
              u.first_name,
              u.last_name,
              u.email,
              u.address_id,
              a.street,
              a.house_number,
              a.zipcode,
              a.country,
              a.city
       FROM User u
              LEFT JOIN Address a ON u.address_id = a.address_id
       WHERE u.user_id = ?`, [customer_id]
    );
    res.status(200).json(currentCustomerAttributes[0]);
  } catch (error: any) {
    console.error('Fehler beim Laden der Kunden:', error);
    res.status(500).json({
      message: 'Fehler beim Laden der Kunden',
      error: error.message
    });
  } finally {
    await con.end();
  }
});

app.put('/api/edit-customer', async (req, res) => {
  const user = req.session.user;

  if (!user || user.role !== 'employee') {
    return res.status(403).json({ message: 'Nur Mitarbeiter dürfen Kunden bearbeiten' });
  }

  const { customer_id, first_name, last_name, email, street, house_number, zipcode, country, city } = req.body;

  if (!customer_id || !first_name || !last_name || !email || !street || !house_number || !zipcode || !country || !city) {
    return res.status(400).json({ message: 'Fehlende Pflichtfelder (customer_id, first_name, last_name, email, street, house_number, zipcode, country, city)' });
  }

  const con = createConnection(dbConfig).promise();

  try {
    await con.connect();

    const [currentCustomerRows] = await con.query<RowDataPacket[]>(
      `SELECT u.user_id,
              u.first_name,
              u.last_name,
              u.email,
              u.address_id,
              a.street,
              a.house_number,
              a.zipcode,
              a.country,
              a.city
       FROM User u
              LEFT JOIN Address a ON u.address_id = a.address_id
       WHERE u.user_id = ?`, [customer_id]
    );

    if (currentCustomerRows.length === 0) {
      await con.end();
      return res.status(404).json({ message: 'Kunde nicht gefunden' });
    }

    const oldValues = currentCustomerRows[0];
    const changes = [];

    if (oldValues['first_name'] !== first_name) {
      changes.push({ field: 'first_name', before: oldValues['first_name'], after: first_name });
    }
    if (oldValues['last_name'] !== last_name) {
      changes.push({ field: 'last_name', before: oldValues['last_name'], after: last_name });
    }
    if (oldValues['email'] !== email) {
      changes.push({ field: 'email', before: oldValues['email'], after: email });
    }
    if (oldValues['street'] !== street) {
      changes.push({ field: 'street', before: oldValues['street'], after: street });
    }
    if (oldValues['house_number'] !== house_number) {
      changes.push({ field: 'house_number', before: oldValues['house_number'], after: house_number });
    }
    if (String(oldValues['zipcode']) !== String(zipcode)) {
      changes.push({ field: 'zipcode', before: oldValues['zipcode'], after: zipcode });
    }
    if (oldValues['country'] !== country) {
      changes.push({ field: 'country', before: oldValues['country'], after: country });
    }
    if (oldValues['city'] !== city) {
      changes.push({ field: 'city', before: oldValues['city'], after: city });
    }

    let address_id = oldValues['address_id'];

    if (address_id) {
      await con.query(
        'UPDATE Address SET street = ?, house_number = ?, zipcode = ?, country = ?, city = ? WHERE address_id = ?',
        [street, house_number, zipcode, country, city, address_id]
      );
      await con.query('UPDATE User SET address_id = ?, first_name = ?, last_name = ?, email = ? WHERE user_id = ?',
        [address_id, first_name, last_name, email, customer_id]);
    } else {
      const [addressResult]: any = await con.execute(
        'INSERT INTO Address (street, house_number, zipcode, country, city) VALUES (?, ?, ?, ?, ?)',
        [street, house_number, zipcode, country, city]
      );
      address_id = addressResult.insertId;
      await con.query('UPDATE User SET address_id = ?, first_name = ?, last_name = ?, email = ? WHERE user_id = ?',
        [address_id, first_name, last_name, email, customer_id]);
    }

    if (changes.length > 0) {
      const changePromises = changes.map(change =>
        con.query(
          'INSERT INTO User_Change (user_id, employee_id, field_changed, change_date, field_before, field_after) VALUES (?, ?, ?, CURDATE(), ?, ?)',
          [customer_id, user.user_id, change.field, change.before, change.after]
        )
      );
      await Promise.all(changePromises);
    }

    await con.end();
    return res.status(200).json({
      message: 'Kunde erfolgreich aktualisiert',
      changes_made: changes.length
    });
  } catch (error: any) {
    await con.end();
    console.error('Fehler beim Aktualisieren des Kunden:', error);
    return res.status(500).json({
      message: 'Fehler beim Aktualisieren des Kunden',
      error: error.message
    });
  }
});

app.get('/api/get-orders', (req, res) => {
  const con = createConnection(dbConfig);
  con.connect(err => {
    if (err) {
      res.status(500).send("DB connection error");
      return;
    }
    con.query("SELECT * FROM Customer_Order", (error, results) => {
      if (error) {
        res.status(500).send(error);
      } else {
        res.send(results);
      }
      con.end();
    });
  });
});

app.get('/api/get-order/:id', (req, res) => {
  const order_id = req.params.id;
  const con = createConnection(dbConfig);
  con.connect(err => {
    if (err) {
      res.status(500).send("DB connection error");
      return;
    }
    con.query("SELECT * FROM Customer_Order WHERE order_id = ?",
      [order_id],
      (error, results) => {
        if (error) {
          res.status(500).send(error);
        } else {
          if (Array.isArray(results) && results.length === 0) {
            res.status(404).send('Bestellung nicht gefunden');
          } else if (Array.isArray(results)) {
            res.send(results[0]);
          } else {
            res.status(500).send('Unerwartetes Ergebnis');
          }
        }
        con.end();
      });
  });
});

app.put('/api/edit-order', async (req, res) => {
  const user = req.session.user;

  if (!user || user.role !== 'employee') {
    return res.status(403).json({ message: 'Nur Mitarbeiter dürfen Bestellungen bearbeiten' });
  }

  const { order_id, customer_id, date, delivery_status, total_price, payment_method } = req.body;

  if (!order_id || !customer_id || !date || !delivery_status || !total_price || !payment_method) {
    return res.status(400).json({ message: 'Fehlende Pflichtfelder' });
  }

  const con = createConnection(dbConfig).promise();

  try {
    await con.connect();

    const [currentOrderRows] = await con.query<RowDataPacket[]>(
      'SELECT customer_id, date, delivery_status, total_price, payment_method FROM Customer_Order WHERE order_id = ?',
      [order_id]
    );

    if (currentOrderRows.length === 0) {
      await con.end();
      return res.status(404).json({ message: 'Bestellung nicht gefunden' });
    }

    const oldValues = currentOrderRows[0];
    const changes = [];

    if (oldValues['customer_id'] !== customer_id) {
      changes.push({ field: 'customer_id', before: oldValues['customer_id'], after: customer_id });
    }
    if (new Date(oldValues['date']).toISOString().split('T')[0] !== new Date(date).toISOString().split('T')[0]) {
      changes.push({ field: 'date', before: oldValues['date'], after: date });
    }
    if (oldValues['delivery_status'] !== delivery_status) {
      changes.push({ field: 'delivery_status', before: oldValues['delivery_status'], after: delivery_status });
    }
    if (oldValues['total_price'] !== total_price) {
      changes.push({ field: 'total_price', before: oldValues['total_price'], after: total_price });
    }
    if (oldValues['payment_method'] !== payment_method) {
      changes.push({ field: 'payment_method', before: oldValues['payment_method'], after: payment_method });
    }

    await con.query(
      'UPDATE Customer_Order SET customer_id = ?, date = ?, delivery_status = ?, total_price = ?, payment_method = ? WHERE order_id = ?',
      [customer_id, new Date(date).toISOString().split('T')[0], delivery_status, total_price, payment_method, order_id]
    );

    if (changes.length > 0) {
      const changePromises = changes.map(change =>
        con.query(
          'INSERT INTO Order_Change (employee_id, order_id, field_changed, change_date, field_before, field_after) VALUES (?, ?, ?, CURDATE(), ?, ?)',
          [user.user_id, order_id, change.field, change.before, change.after]
        )
      );
      await Promise.all(changePromises);
    }

    await con.end();
    return res.status(200).json({
      message: 'Bestellung erfolgreich aktualisiert',
      changes_made: changes.length
    });
  } catch (error: any) {
    await con.end();
    console.error('Fehler beim Aktualisieren der Bestellung:', error);
    return res.status(500).json({
      message: 'Fehler beim Aktualisieren der Bestellung',
      error: error.message
    });
  }
});

app.get('/api/get-logs', (req, res) => {
  const con = createConnection(dbConfig);

  con.connect(err => {
    if (err) {
      res.status(500).send("DB connection error");
      return;
    }

    con.query("SELECT * FROM Product_Change", (error1, productLogs) => {
      if (error1) {
        con.end();
        res.status(500).send(error1);
        return;
      }

      con.query("SELECT * FROM Order_Change", (error2, orderLogs) => {
        if (error2) {
          con.end();
          res.status(500).send(error2);
          return;
        }

        con.query("SELECT * FROM User_Change", (error3, userLogs) => {
          con.end();

          if (error3) {
            res.status(500).send(error3);
          } else {
            res.json({
              products: productLogs,
              orders: orderLogs,
              users: userLogs
            });
          }
        });
      });
    });
  });
});

app.post('/api/login', (req, res) => {
  console.log("Anfrage angekommen");
  const con = createConnection(dbConfig);

  const { email, password } = req.body;
  const sql = `
    SELECT u.user_id,
           u.first_name,
           u.last_name,
           u.password,
           u.email,
           CASE
             WHEN c.customer_id IS NOT NULL THEN 'customer'
             WHEN e.employee_id IS NOT NULL THEN 'employee'
             ELSE 'unknown'
             END AS role
    FROM User u
           LEFT JOIN Customer c ON u.user_id = c.customer_id
           LEFT JOIN Employee e ON u.user_id = e.employee_id
    WHERE u.email = ?
      AND u.password = ? LIMIT 1
  `;

  con.query(
    sql,
    [email, password],
    (error, results) => {
      if (error) {
        res.status(500).send(error);
        con.end();
        return;
      }
      const rows = results as any[];
      if (rows.length === 1 && rows[0].role !== 'unknown') {
        req.session.user = {
          user_id: rows[0].user_id,
          role: rows[0].role,
          first_name: rows[0].first_name,
          last_name: rows[0].last_name,
          email: rows[0].email
        };
        res.json({
          user_id: rows[0].user_id,
          role: rows[0].role,
          first_name: rows[0].first_name,
          last_name: rows[0].last_name
        });
      } else {
        res.status(401).json({ message: 'Falsche Zugangsdaten' });
      }
      con.end();
    }
  );
});

app.get('/api/user-details', (req, res) => {
  if (!req.session.user) {
    res.status(401).json({ message: 'Nicht eingeloggt' });
    return;
  }

  const userId = req.session.user.user_id;
  const con = createConnection(dbConfig);

  const sql = `
    SELECT u.user_id,
           u.first_name,
           u.last_name,
           u.email,
           u.address_id,
           a.street,
           a.house_number,
           a.zipcode,
           a.country,
           a.city,
           e.monthly_salary,
           e.role AS employee_role,
           CASE
             WHEN c.customer_id IS NOT NULL THEN 'customer'
             WHEN e.employee_id IS NOT NULL THEN 'employee'
             ELSE 'unknown'
             END  AS role
    FROM User u
           LEFT JOIN Address a ON u.address_id = a.address_id
           LEFT JOIN Customer c ON u.user_id = c.customer_id
           LEFT JOIN Employee e ON u.user_id = e.employee_id
    WHERE u.user_id = ? LIMIT 1
  `;

  con.query(sql, [userId], (error, results) => {
    con.end();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const rows = results as any[];

    if (rows.length === 0) {
      res.status(404).json({ message: 'User nicht gefunden' });
      return;
    }

    const row = rows[0];

    const userDetails = {
      user_id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      role: row.role,
      address: row.address_id ? {
        street: row.street,
        house_number: row.house_number,
        zipcode: row.zipcode,
        country: row.country,
        city: row.city,
      } : null,
      employee_data: row.employee_role ? {
        monthly_salary: row.monthly_salary,
        role: row.employee_role,
      } : null
    };

    res.json(userDetails);
  });
});

app.get('/api/me', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: 'Nicht eingeloggt' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html'
  }),
);

app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
    }
  });

  app.set('io', io);

  httpServer.listen(port, () => {
    console.log(`Node Express is listening on http://localhost:${port}`);
  });
}

export default app;