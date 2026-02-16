const express = require('express');
const swaggerUi = require('swagger-ui-express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: "*"
}));
app.use(express.json());
app.use(bodyParser.json());

app.use('/api/auth', require('./routes/authRoute'));
app.use('/api/products', require('./routes/productRoute'));
app.use('/api/customers', require('./routes/customerRoute'));
app.use('/api/company', require('./routes/companyRoute'));
app.use('/api/staffs', require('./routes/staffRoute'));
app.use('/api/invoices', require('./routes/invoiceRoute'));
app.use('/api/imports', require('./routes/importRoute'));
app.use('/api/dashboard', require('./routes/dashboardRoute'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});