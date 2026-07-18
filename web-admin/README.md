Datos
Customer: address, nombre
Company:  address, nombre
Product: (product, id), nombre, precio
Invoices:(invoice , id), fecha, address_customer, amount, status, tx_pago
Details: (details,id, invoice_id, product_id), price, quantity

usaremos una map y un array.

el array de struct tendra el tipo y el id

con el map tendremos el id -> binario