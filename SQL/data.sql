INSERT INTO Customer (Cid, Id_number, Fname, Lname, Tel, Email) VALUES
('C0001', '1234567890123', 'Somchai', 'Jaidee', '0811111111', 'somchai@mail.com'),
('C0002', '9876543210987', 'Suda', 'Dee', '0822222222', 'suda@mail.com');

INSERT INTO Owner (OId, OPassword, Fname, Lname, Tel, Email) VALUES
('O0001', 'owner123', 'Anan', 'Manager', '0899999999', 'owner@mail.com');

INSERT INTO Employee (EMPid, UPassword, Fname, Lname, User_Role, Tel, Email, OId) VALUES
('EMP0000000001', 'emp123', 'Niran', 'Staff', 'Reception', '0833333333', 'niran@mail.com', 'O0001'),
('EMP0000000002', 'emp456', 'Kanya', 'Cleaner', 'Housekeeping', '0844444444', 'kanya@mail.com', 'O0001');

INSERT INTO Room (Rid, RNum, RType, RDesc, RPrice, RStatus) VALUES
('R0001', '101', 'เตียงเดี่ยว', 'single bed', 1200, 'Available'),
('R0002', '102', 'เตียงคู่', 'double bed', 1800, 'Available');

INSERT INTO Service (Sid, SName, Sprice) VALUES
('S0001', 'Breakfast', 200),
('S0002', 'Airport Pickup', 800);


INSERT INTO Task (Tid, Tdate, TStatus) VALUES
('T0001', CURRENT_DATE, 'Pending'),
('T0002', CURRENT_DATE, 'Pending');

INSERT INTO Booking
(Bid, BStatus, Bnum_people, Bcheckin_date, Bcheckout_date, Cid, BDate)
VALUES
('B0001', 'Confirmed', 2, '2026-03-01', '2026-03-03', 'C0001', CURRENT_DATE),
('B0002', 'Confirmed', 1, '2026-03-05', '2026-03-06', 'C0002', CURRENT_DATE);

INSERT INTO Booking_Room (Bid, Rid) VALUES
('B0001', 'R0001'),
('B0002', 'R0002');

INSERT INTO Booking_Service (Bid, Sid) VALUES
('B0001', 'S0001'),
('B0001', 'S0002');

INSERT INTO Booking_Task (Tid, Bid) VALUES
('T0001', 'B0001'),
('T0002', 'B0002');

INSERT INTO Employee_Task (EMPid, Tid) VALUES
('EMP0000000002', 'T0001'),
('EMP0000000002', 'T0002');

INSERT INTO Room_Task (Tid, Rid) VALUES
('T0001', 'R0001'),
('T0002', 'R0002');