import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Container, Typography, TextField, Select, MenuItem, Button, Box, List, ListItem, ListItemText,
  Paper, FormControl, InputLabel, Divider, Alert
} from '@mui/material';
import SaveAltIcon from '@mui/icons-material/SaveAlt';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]); // Store all transactions for month list
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [predictedSavings, setPredictedSavings] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all'); // Default to 'all'
  const [error, setError] = useState(null);

  const fetchData = (month = '') => {
    const url = month && month !== 'all' ? `https://finance-tracker-backend.onrender.com/api/transactions/?month=${month}` : 'https://finance-tracker-backend.onrender.com/api/transactions/';
    const predictUrl = month && month !== 'all' ? `https://finance-tracker-backend.onrender.com/api/predict/?month=${month}` : 'https://finance-tracker-backend.onrender.com/api/predict/';
  // ... rest of the function
    axios.get(url)
      .then(response => {
        if (response.data.error) {
          setTransactions([]);
          setError(response.data.error);
        } else {
          setTransactions(response.data);
          setError(null);
        }
      })
      .catch(error => {
        setTransactions([]);
        setError(error.response?.data?.error || 'Failed to fetch transactions');
      });

    axios.get(predictUrl)
      .then(response => {
        if (response.data.error) {
          setPredictedSavings(0);
          setError(response.data.error);
        } else {
          setPredictedSavings(response.data.predicted_savings);
          setError(null);
        }
      })
      .catch(error => {
        setPredictedSavings(0);
        setError(error.response?.data?.error || 'Failed to fetch prediction');
      });

    // Fetch all transactions for month list (only once or after adding)
    axios.get('http://127.0.0.1:8000/api/transactions/')
      .then(response => setAllTransactions(response.data))
      .catch(error => console.error('Failed to fetch all transactions'));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newTransaction = { amount, category, type, date, description };
    axios.post('http://127.0.0.1:8000/api/transactions/', newTransaction)
      .then(response => {
        setTransactions([...transactions, response.data]);
        setAmount(''); setCategory(''); setDate(''); setDescription('');
        fetchData(selectedMonth); // Refresh with current filter
        setError(null);
      })
      .catch(error => {
        setError(error.response?.data?.detail || 'Failed to add transaction');
      });
  };

  const handleMonthChange = (e) => {
    const month = e.target.value;
    setSelectedMonth(month);
    fetchData(month);
  };

  // Get unique months from all transactions
  const getUniqueMonths = () => {
    const months = allTransactions.map(t => {
      const date = new Date(t.date);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    });
    return [...new Set(months)].sort(); // Remove duplicates and sort
  };

  const chartData = {
    labels: transactions.map(t => t.category),
    datasets: [{
      label: 'Amount',
      data: transactions.map(t => t.amount),
      backgroundColor: transactions.map(t => t.type === 'income' ? 'green' : 'red'),
    }]
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const content = document.getElementById('pdf-content');

    html2canvas(content).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 190;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      doc.save('finance_report.pdf');
    });
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Personal Finance Tracker
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            variant="outlined"
            size="small"
          />
          <TextField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            variant="outlined"
            size="small"
          />
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select value={type} onChange={(e) => setType(e.target.value)} label="Type">
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="income">Income</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            size="small"
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
          />
          <Button type="submit" variant="contained" color="primary">
            Add Transaction
          </Button>
        </Box>
      </Paper>

      {/* Dynamic Month Dropdown */}
      <Box sx={{ mb: 3 }}>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Month</InputLabel>
          <Select
            value={selectedMonth}
            onChange={handleMonthChange}
            label="Filter by Month"
          >
            <MenuItem value="all">All Months</MenuItem>
            {getUniqueMonths().map(month => (
              <MenuItem key={month} value={month}>
                {new Date(month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper elevation={3} sx={{ p: 3 }} id="pdf-content">
        <Typography variant="h6" gutterBottom>Transactions</Typography>
        <List>
          {transactions.map(t => (
            <ListItem key={t.id}>
              <ListItemText primary={`${t.type} - $${t.amount} - ${t.category} - ${t.date}`} />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>Monthly Report</Typography>
        <Bar data={chartData} />
      </Paper>

      <Typography variant="h6" sx={{ mt: 3 }}>Predicted Savings (Next Month)</Typography>
      {predictedSavings !== null ? (
        <Typography variant="body1">${predictedSavings}</Typography>
      ) : (
        <Typography variant="body1">Loading prediction...</Typography>
      )}

      <Button
        variant="contained"
        color="success"
        startIcon={<SaveAltIcon />}
        onClick={exportToPDF}
        sx={{ mt: 3 }}
      >
        Export to PDF
      </Button>
    </Container>
  );
}

export default App;
