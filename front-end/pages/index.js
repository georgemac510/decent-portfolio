import { useState } from 'react';

export default function Home() {
  const [formData, setFormData] = useState({
    _id: '',
    asset: '',
    trade: '',
    quantity: '',
    price: '',
    date: '',
    rating: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsedValue = name === 'quantity' || name === 'price' || name === 'rating' ? parseFloat(value) : value;
    setFormData(prevData => ({
      ...prevData,
      [name]: parsedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3000/api/add-entry', { // Update port to 3000
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        console.log('Entry added successfully');
      } else {
        console.error('Failed to add entry');
      }
    } catch (error) {
      console.error('Internal server error:', error);
    }
  };

  return (
    <div>
      <h1>Add Entry</h1>
      <form onSubmit={handleSubmit}>
        <label>
          ID:
          <input type="text" name="_id" value={formData._id} onChange={handleChange} />
        </label>
        <br />
        <label>
          Asset:
          <input type="text" name="asset" value={formData.asset} onChange={handleChange} />
        </label>
        <br />
        <label>
          Trade:
          <input type="text" name="trade" value={formData.trade} onChange={handleChange} />
        </label>
        <br />
        <label>
          Quantity:
          <input type="text" name="quantity" value={formData.quantity} onChange={handleChange} />
        </label>
        <br />
        <label>
          Price:
          <input type="text" name="price" value={formData.price} onChange={handleChange} />
        </label>
        <br />
        <label>
          Date:
          <input type="text" name="date" value={formData.date} onChange={handleChange} />
        </label>
        <br />
        <label>
          Rating:
          <input type="text" name="rating" value={formData.rating} onChange={handleChange} />
        </label>
        <br />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

