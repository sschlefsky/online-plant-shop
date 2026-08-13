-- Optional: Vorherige Tabellen löschen
DROP TABLE IF EXISTS Cart_Item;
DROP TABLE IF EXISTS Order_Item;
DROP TABLE IF EXISTS Product_Change;
DROP TABLE IF EXISTS User_Change;
DROP TABLE IF EXISTS Order_Change;
DROP TABLE IF EXISTS Invoice;
DROP TABLE IF EXISTS Customer_Order;
DROP TABLE IF EXISTS Cart;
DROP TABLE IF EXISTS Product;
DROP TABLE IF EXISTS Employee;
DROP TABLE IF EXISTS Customer;
DROP TABLE IF EXISTS User;
DROP TABLE IF EXISTS Address;

-- Adresse
CREATE TABLE Address (
  address_id INT AUTO_INCREMENT PRIMARY KEY,
  street VARCHAR(100),
  house_number VARCHAR(10),
  zipcode INT,
  country VARCHAR(255),
  city VARCHAR(255)
);

-- Benutzer
CREATE TABLE User (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(50),
  last_name VARCHAR(100),
  password VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  address_id INT,
  FOREIGN KEY (address_id) REFERENCES Address(address_id) 
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

-- Kunden (leitet sich von User ab)
CREATE TABLE Customer (
  customer_id INT PRIMARY KEY,
  FOREIGN KEY (customer_id) REFERENCES User(user_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

-- Mitarbeiter (leitet sich auch von User ab)
CREATE TABLE Employee (
  employee_id INT PRIMARY KEY,
  monthly_salary DECIMAL(10,2),
  role VARCHAR(255),
  FOREIGN KEY (employee_id) REFERENCES User(user_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

-- Produkte
CREATE TABLE Product (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  price DECIMAL(10,2),
  description VARCHAR(255),
  stock_quantity INT,
  image VARCHAR(255)
);

-- Warenkorb
CREATE TABLE Cart (
  cart_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  total_price DECIMAL(10,2) DEFAULT 0.00,
  FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);

-- Bestellungen
CREATE TABLE Customer_Order (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  date DATE,
  delivery_status VARCHAR(255),
  total_price DECIMAL(10,2),
  payment_method VARCHAR(50),
  FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) 
    ON DELETE RESTRICT 
    ON UPDATE CASCADE
);

-- Rechnungen
CREATE TABLE Invoice (
  invoice_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  amount DECIMAL(10,2),
  payment_status VARCHAR(255),
  invoice_date DATE,
  due_date DATE,
  FOREIGN KEY (order_id) REFERENCES Customer_Order(order_id) 
    ON DELETE CASCADE
);

-- Positionen in Bestellungen
CREATE TABLE Order_Item (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  product_id INT NULL,  quantity INT,
  price DECIMAL(10,2),
  FOREIGN KEY (order_id) REFERENCES Customer_Order(order_id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  FOREIGN KEY (product_id) REFERENCES Product(product_id) 
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

-- Positionen in Warenkörben
CREATE TABLE Cart_Item (
  cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
  cart_id INT,
  product_id INT,
  quantity INT,
  price DECIMAL(10,2),
  FOREIGN KEY (cart_id) REFERENCES Cart(cart_id) 
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  FOREIGN KEY (product_id) REFERENCES Product(product_id) 
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

-- Produktänderungen
CREATE TABLE Product_Change (
  product_change_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NULL,
  product_id INT,
  field_changed VARCHAR(255),
  change_date DATE,
  field_before VARCHAR(255),
  field_after VARCHAR(255),
  FOREIGN KEY (employee_id) REFERENCES Employee(employee_id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE,
  FOREIGN KEY (product_id) REFERENCES Product(product_id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE
);

-- Useränderungen
CREATE TABLE User_Change (
  user_change_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  employee_id INT NULL,
  field_changed VARCHAR(255),
  change_date DATE,
  field_before VARCHAR(255),
  field_after VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES User(user_id)
    ON DELETE SET NULL 
    ON UPDATE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES Employee(employee_id)
    ON DELETE SET NULL 
    ON UPDATE CASCADE
);

-- Bestellungsänderungen
CREATE TABLE Order_Change (
  order_change_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  employee_id INT NULL,
  field_changed VARCHAR(255),
  change_date DATE,
  field_before VARCHAR(255),
  field_after VARCHAR(255),
  FOREIGN KEY (order_id) REFERENCES Customer_Order(order_id)
    ON DELETE SET NULL 
    ON UPDATE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES Employee(employee_id)
    ON DELETE SET NULL 
    ON UPDATE CASCADE
);

-- Automatisch Warenkorb anlegen, wenn Kunde registriert
DELIMITER //
CREATE TRIGGER create_cart_after_new_customer
AFTER INSERT ON Customer
FOR EACH ROW
BEGIN
  INSERT INTO Cart (customer_id, total_price)
  VALUES (NEW.customer_id, 0.00);
END;
//
DELIMITER ;

-- Rechnung erstellen nachdem Bestellung getaetigt wurde
DELIMITER //
CREATE TRIGGER create_invoice_after_order
AFTER INSERT ON Customer_Order
FOR EACH ROW
BEGIN
  INSERT INTO Invoice (order_id, amount, payment_status, invoice_date, due_date)
  VALUES (NEW.order_id, NEW.total_price, 'open', CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 14 DAY));
END;
//
DELIMITER ;


-- Adressen
INSERT INTO Address (street, house_number, zipcode, country, city) VALUES
('Hauptstraße', '12', 10115, 'Deutschland', 'Berlin'),
('Bahnhofstraße', '45', 80331, 'Deutschland', 'München'),
('Marktplatz', '8', 50667, 'Deutschland', 'Köln'),
('Lindenweg', '3', 28195, 'Deutschland', 'Bremen'),
('Gartenstraße', '22', 01067, 'Deutschland', 'Dresden'),
('Waldweg', '7', 04109, 'Deutschland', 'Leipzig'),
('Bergstraße', '10', 79098, 'Deutschland', 'Freiburg'),
('Seestraße', '5', 20095, 'Deutschland', 'Hamburg'),
('Parkallee', '20', 90402, 'Deutschland', 'Nürnberg'),
('Rosenweg', '14', 70173, 'Deutschland', 'Stuttgart');

-- Benutzer (User)
INSERT INTO User (first_name, last_name, password, email, address_id) VALUES
('Anna', 'Müller', '1', 'anna.mueller@example.com', 1),
('Ben', 'Schmidt', '2', 'ben.schmidt@example.com', 2),
('Clara', 'Weber', '3', 'clara.weber@example.com', 3),
('David', 'Neumann', '4', 'david.neumann@example.com', 4),
('Emma', 'Schneider', '5', 'emma.schneider@example.com', 5),
('Felix', 'Hoffmann', '6', 'felix.hoffmann@example.com', 6),
('Greta', 'Schulz', '7', 'greta.schulz@example.com', 7),
('Heiko', 'Brandt', '8', 'heiko.brandt@example.com', 8),
('Ines', 'Meier', '9', 'ines.meier@example.com', 9),
('Jonas', 'Friedrich', '10', 'jonas.friedrich@example.com', 10),
('Max', 'Mustermann', '1', '1', 1),
('Lisa', 'Beispiel', '2', '2', 2);

-- Kunden (Customer)
INSERT INTO Customer (customer_id) VALUES
(1),
(2),
(3),
(4),
(5),
(12);

-- Mitarbeiter
INSERT INTO Employee (employee_id, monthly_salary, role) VALUES
(6, 2800.00, 'Verwaltung'),
(7, 3200.00, 'Lager'),
(8, 3000.00, 'Kundenservice'),
(9, 3500.00, 'Produktmanagement'),
(10, 4000.00, 'Geschäftsführung'),
(11, 2500.00, 'Admin');

-- Produkte
INSERT INTO Product (name, price, description, stock_quantity, image) VALUES
('Monstera Deliciosa', 25.00, 'Beliebte tropische Zimmerpflanze mit großen Blättern', 50, 'monsteradeliciosa.jpg'),
('Ficus Benjamina', 30.00, 'Pflegeleichter Zimmerbaum, auch „Birkenfeige“ genannt', 40, 'ficusbenjamina.jpg'),
('Sansevieria', 20.00, 'Ideal für Anfänger', 60, 'sansevieria.jpg'),
('Aloe Vera', 15.00, 'Heilpflanze mit pflegeleichten Ansprüchen', 80, 'aloevera.jpg'),
('Calathea', 35.00, 'Dekorative Blätter mit Muster – braucht viel Feuchtigkeit', 30, 'calathea.jpg'),
('Hoya Kerrii', 15.00, 'Herzförmige Blätter, beliebte Geschenkidee', 45, 'hoyakerrii.jpg'),
('Sinningia', 22.00, 'Blütenreiche Zimmerpflanze mit samtigen Blättern', 35, 'sinningia.jpg'),
('Zamioculcas Zamiifolia', 28.00, 'Robuste Pflanze, ideal für dunklere Räume', 50, 'zamioculcaszamiifolia.jpg'),
('Orchidee', 32.00, 'Elegante Blühpflanze mit exotischem Flair', 40, 'orchideen.jpg'),
('Lithops', 18.00, '„Lebende Steine“ – sukkulente Miniaturpflanzen', 55, 'lithops.jpg'),
('Lavendel', 12.00, 'Duftende Pflanze mit beruhigender Wirkung', 70, 'lavendel.jpg');

-- Produktänderungen
INSERT INTO Product_Change (employee_id, product_id, field_changed, change_date, field_before, field_after) VALUES
(9, 1, 'price', '2025-06-01', '20', '25'),
(9, 3, 'description', '2025-06-02', 'Ideal für Anfänger', 'Ideal für Anfänger'),
(8, 5, 'stock_quantity', '2025-06-03', '20', '30'),
(7, 4, 'price', '2025-06-04', '10', '15'),
(7, 2, 'name', '2025-06-05', 'Ficus', 'Ficus Benjamina');

-- Dummy Daten
INSERT INTO Customer_Order (customer_id, date, delivery_status, total_price, payment_method) VALUES
(1, '2025-06-01', 'versendet', 65.00, 'PayPal'),
(2, '2025-06-05', 'in Bearbeitung', 60.00, 'Rechnung'),
(3, '2025-06-10', 'versendet', 30.00, 'SEPA'),
(4, '2025-06-15', 'offen', 35.00, 'Kreditkarte'),
(5, '2025-06-20', 'abgeschlossen', 35.00, 'PayPal');

INSERT INTO Order_Item (order_id, product_id, quantity, price) VALUES
(1, 2, 2, 50.00), 
(1, 4, 1, 15.00),
(2, 3, 3, 60.00),  
(3, 2, 1, 30.00),    
(4, 5, 1, 35.00);

-- Änderung 1: Emma Schneider (user_id = 5) – Änderung der E-Mail
INSERT INTO User_Change (user_id, employee_id, field_changed, change_date, field_before, field_after) VALUES
(5, 8, 'email', '2025-06-05', 'emma.schneider@altmail.de', 'emma.schneider@example.com');

-- Änderung 2: Clara Weber (user_id = 3) – Änderung des Nachnamens
INSERT INTO User_Change (user_id, employee_id, field_changed, change_date, field_before, field_after) VALUES
(3, 6, 'last_name', '2025-06-08', 'Schmidt', 'Weber');

-- Änderung 3: Jonas Friedrich (user_id = 10) – Änderung des Passworts
INSERT INTO User_Change (user_id, employee_id, field_changed, change_date, field_before, field_after) VALUES
(10, 9, 'password', '2025-06-10', '1234', '10');

-- Änderung 1: Bestellung 2 – Änderung des Lieferstatus
INSERT INTO Order_Change (order_id, employee_id, field_changed, change_date, field_before, field_after) VALUES
(2, 7, 'delivery_status', '2025-06-06', 'offen', 'in Bearbeitung');

-- Änderung 2: Bestellung 4 – Änderung der Zahlungsmethode
INSERT INTO Order_Change (order_id, employee_id, field_changed, change_date, field_before, field_after) VALUES
(4, 8, 'payment_method', '2025-06-16', 'SEPA', 'Kreditkarte');

-- Änderung 3: Bestellung 1 – Änderung des Gesamtpreises
INSERT INTO Order_Change (order_id, employee_id, field_changed, change_date, field_before, field_after) VALUES
(1, 9, 'total_price', '2025-06-02', '60.00', '65.00');