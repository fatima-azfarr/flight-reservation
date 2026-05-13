-- ============================================================
-- Enhanced Flight Reservation System
-- MySQL-compatible schema (converted from SQL Server)
-- ============================================================

CREATE DATABASE IF NOT EXISTS EnhancedFlightReservation;
USE EnhancedFlightReservation;

-- 1) Users
CREATE TABLE Users (
    userId VARCHAR(10) PRIMARY KEY,
    name VARCHAR(30) NOT NULL,
    email VARCHAR(35) NOT NULL UNIQUE,
    phoneNumber VARCHAR(15) UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    salt VARCHAR(128),
    passwordResetToken VARCHAR(128),
    passwordResetExpires DATETIME,
    loyaltyPoints INT DEFAULT 0 CHECK (loyaltyPoints >= 0),
    country VARCHAR(20) NOT NULL,
    city VARCHAR(20) NOT NULL,
    area VARCHAR(15),
    street VARCHAR(10)
);

-- 2) Passport
CREATE TABLE Passport (
    passportId VARCHAR(10) PRIMARY KEY,
    userId VARCHAR(10),
    passportNumber VARCHAR(20) NOT NULL UNIQUE,
    passportCountry VARCHAR(20) NOT NULL,
    passportExpiry DATE NOT NULL,
    FOREIGN KEY (userId) REFERENCES Users(userId) ON DELETE CASCADE
);

-- 3) Flight
CREATE TABLE Flight (
    flightId VARCHAR(10) PRIMARY KEY,
    flightNumber VARCHAR(10) NOT NULL UNIQUE,
    departureTime DATETIME NOT NULL,
    arrivalTime DATETIME NOT NULL,
    fromLocation VARCHAR(40) NOT NULL,
    toLocation VARCHAR(40) NOT NULL,
    availableSeats INT CHECK (availableSeats >= 0),
    status ENUM('Scheduled','Boarding','Departed','In-Air','Delayed','Landed','Cancelled') NOT NULL DEFAULT 'Scheduled'
);

-- 4) Booking
CREATE TABLE Booking (
    bookingId VARCHAR(10) PRIMARY KEY,
    userId VARCHAR(10),
    flightId VARCHAR(10),
    bookingDate DATETIME NOT NULL,
    seatNumber VARCHAR(10),
    paymentStatus ENUM('Pending','Completed','Failed') NOT NULL DEFAULT 'Pending',
    totalAmount DECIMAL(10,2) CHECK (totalAmount >= 0),
    FOREIGN KEY (userId) REFERENCES Users(userId) ON DELETE CASCADE,
    FOREIGN KEY (flightId) REFERENCES Flight(flightId) ON DELETE CASCADE
);

-- 5) Luggage
CREATE TABLE Luggage (
    luggageId VARCHAR(10) PRIMARY KEY,
    bookingId VARCHAR(10),
    status ENUM('Checked-in','In Transit','Delivered','Lost') NOT NULL DEFAULT 'Checked-in',
    location ENUM('Check-in Counter','Security Check','Sorting Area','Loaded on Flight','In Transit','Baggage Claim','Delivered','Lost and Found'),
    trackingNumber VARCHAR(15) UNIQUE,
    FOREIGN KEY (bookingId) REFERENCES Booking(bookingId) ON DELETE CASCADE
);

-- 6) GroupBooking
CREATE TABLE GroupBooking (
    groupBookingId VARCHAR(10) PRIMARY KEY,
    userId VARCHAR(10),
    flightId VARCHAR(10),
    totalPeople INT CHECK (totalPeople > 1),
    totalAmount DECIMAL(10,2) CHECK (totalAmount >= 0),
    FOREIGN KEY (userId) REFERENCES Users(userId) ON DELETE CASCADE,
    FOREIGN KEY (flightId) REFERENCES Flight(flightId) ON DELETE CASCADE
);

-- 7) Refund
CREATE TABLE Refund (
    refundId VARCHAR(10) PRIMARY KEY,
    bookingId VARCHAR(10),
    refundAmount DECIMAL(10,2) CHECK (refundAmount >= 0),
    status ENUM('Requested','Approved','Rejected','Processed') NOT NULL DEFAULT 'Requested',
    requestDate DATETIME NOT NULL,
    processedDate DATETIME,
    FOREIGN KEY (bookingId) REFERENCES Booking(bookingId) ON DELETE CASCADE
);

-- 8) Payment
CREATE TABLE Payment (
    paymentId VARCHAR(10) PRIMARY KEY,
    bookingId VARCHAR(10),
    paymentDate DATETIME NOT NULL,
    paymentMethod ENUM('Credit Card','Debit Card','Bank Transfer','Cash','UPI'),
    paymentStatus ENUM('Pending','Completed','Failed') NOT NULL DEFAULT 'Pending',
    paymentAmount DECIMAL(10,2) CHECK (paymentAmount >= 0),
    FOREIGN KEY (bookingId) REFERENCES Booking(bookingId) ON DELETE CASCADE
);

-- 9) Hotel
CREATE TABLE Hotel (
    hotelId VARCHAR(10) PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    location VARCHAR(40) NOT NULL,
    pricePerNight DECIMAL(10,2) CHECK (pricePerNight >= 0)
);

-- 10) CarRental
CREATE TABLE CarRental (
    carRentalId VARCHAR(10) PRIMARY KEY,
    carModel VARCHAR(15) NOT NULL,
    pricePerDay DECIMAL(10,2) CHECK (pricePerDay >= 0),
    location VARCHAR(30) NOT NULL
);

-- 11) FrequentFlyer
CREATE TABLE FrequentFlyer (
    frequentFlyerId VARCHAR(10) PRIMARY KEY,
    userId VARCHAR(10),
    loyaltyPoints INT DEFAULT 0 CHECK (loyaltyPoints >= 0),
    tierLevel ENUM('Bronze','Silver','Gold','Platinum','Diamond') DEFAULT 'Bronze',
    FOREIGN KEY (userId) REFERENCES Users(userId) ON DELETE CASCADE
);

-- 12) FlightNotification
CREATE TABLE FlightNotification (
    notificationId VARCHAR(10) PRIMARY KEY,
    userId VARCHAR(10),
    flightId VARCHAR(10),
    message TEXT NOT NULL,
    notificationDate DATETIME NOT NULL,
    FOREIGN KEY (userId) REFERENCES Users(userId) ON DELETE CASCADE,
    FOREIGN KEY (flightId) REFERENCES Flight(flightId) ON DELETE CASCADE
);

-- 13) PasswordResetTokens
CREATE TABLE PasswordResetTokens (
    tokenId VARCHAR(10) PRIMARY KEY,
    userId VARCHAR(10) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expiry DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES Users(userId) ON DELETE CASCADE
);

-- 14) UserSessions
CREATE TABLE UserSessions (
    sessionId VARCHAR(64) PRIMARY KEY,
    userId VARCHAR(10) NOT NULL,
    loginTime DATETIME NOT NULL,
    lastActivity DATETIME NOT NULL,
    ipAddress VARCHAR(45),
    userAgent VARCHAR(255),
    FOREIGN KEY (userId) REFERENCES Users(userId) ON DELETE CASCADE
);

-- 15) TwoFactorAuth
CREATE TABLE TwoFactorAuth (
    twoFactorId VARCHAR(10) PRIMARY KEY,
    userId VARCHAR(10) NOT NULL UNIQUE,
    method ENUM('Email','SMS','App'),
    secret VARCHAR(64),
    isEnabled TINYINT(1) DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES Users(userId) ON DELETE CASCADE
);

-- 16) Invoice
CREATE TABLE Invoice (
    invoiceId VARCHAR(10) PRIMARY KEY,
    bookingId VARCHAR(10),
    invoiceNumber VARCHAR(20) NOT NULL UNIQUE,
    issueDate DATETIME NOT NULL,
    dueDate DATETIME NOT NULL,
    totalAmount DECIMAL(10,2) NOT NULL,
    taxAmount DECIMAL(10,2) NOT NULL,
    discountAmount DECIMAL(10,2) DEFAULT 0,
    status ENUM('Pending','Paid','Overdue','Cancelled') NOT NULL DEFAULT 'Pending',
    paymentMethod VARCHAR(15),
    paymentDate DATETIME,
    FOREIGN KEY (bookingId) REFERENCES Booking(bookingId) ON DELETE SET NULL
);

-- 17) InvoiceItem
CREATE TABLE InvoiceItem (
    itemId VARCHAR(10) PRIMARY KEY,
    invoiceId VARCHAR(10) NOT NULL,
    description VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    unitPrice DECIMAL(10,2) NOT NULL,
    totalPrice DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (invoiceId) REFERENCES Invoice(invoiceId) ON DELETE CASCADE
);

-- ============================================================
-- TRIGGERS
-- ============================================================

DELIMITER $$

-- 1) Add loyalty points after successful payment
CREATE TRIGGER trg_UpdateLoyaltyPoints
AFTER INSERT ON Payment
FOR EACH ROW
BEGIN
    IF NEW.paymentStatus = 'Completed' THEN
        UPDATE Users u
        JOIN Booking b ON u.userId = b.userId
        SET u.loyaltyPoints = u.loyaltyPoints + FLOOR(NEW.paymentAmount / 100)
        WHERE b.bookingId = NEW.bookingId;
    END IF;
END$$

-- 2) Update flyer tier when loyalty points change
CREATE TRIGGER trg_UpdateTierLevel
AFTER UPDATE ON Users
FOR EACH ROW
BEGIN
    IF NEW.loyaltyPoints <> OLD.loyaltyPoints THEN
        UPDATE FrequentFlyer
        SET tierLevel = CASE
            WHEN NEW.loyaltyPoints >= 10000 THEN 'Diamond'
            WHEN NEW.loyaltyPoints >= 5000  THEN 'Platinum'
            WHEN NEW.loyaltyPoints >= 3000  THEN 'Gold'
            WHEN NEW.loyaltyPoints >= 1000  THEN 'Silver'
            ELSE 'Bronze'
        END
        WHERE userId = NEW.userId;
    END IF;
END$$

-- 3) Block expired passport inserts
CREATE TRIGGER trg_CheckPassportExpiry
BEFORE INSERT ON Passport
FOR EACH ROW
BEGIN
    IF NEW.passportExpiry < CURDATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Passport expiry date is in the past.';
    END IF;
END$$

DELIMITER ;

-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO Flight (flightId, flightNumber, departureTime, arrivalTime, fromLocation, toLocation, availableSeats, status) VALUES
('F001', 'PK301', '2025-07-01 08:00:00', '2025-07-01 09:30:00', 'Lahore', 'Karachi', 120, 'Scheduled'),
('F002', 'PK401', '2025-07-01 11:00:00', '2025-07-01 13:00:00', 'Karachi', 'Islamabad', 90, 'Scheduled'),
('F003', 'PA501', '2025-07-02 06:30:00', '2025-07-02 08:00:00', 'Islamabad', 'Lahore', 80, 'Scheduled'),
('F004', 'PK601', '2025-07-03 14:00:00', '2025-07-03 15:30:00', 'Lahore', 'Islamabad', 110, 'Scheduled'),
('F005', 'SA201', '2025-07-04 09:00:00', '2025-07-04 11:30:00', 'Karachi', 'Quetta', 60, 'Scheduled');

INSERT INTO Hotel (hotelId, name, location, pricePerNight) VALUES
('H001', 'Pearl Continental', 'Lahore', 15000.00),
('H002', 'Serena Hotel', 'Islamabad', 18000.00),
('H003', 'Marriott', 'Karachi', 20000.00);

INSERT INTO CarRental (carRentalId, carModel, pricePerDay, location) VALUES
('CR001', 'Toyota Corolla', 3000.00, 'Lahore'),
('CR002', 'Honda Civic', 3500.00, 'Karachi'),
('CR003', 'Suzuki Alto', 1800.00, 'Islamabad');
