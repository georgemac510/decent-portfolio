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

  const [queryData, setQueryData] = useState({
    _id_query: '',
    asset_query: ''
  });

  const [postDataAddEntry, setPostDataAddEntry] = useState(null);
  const [postDataQuery, setPostDataQuery] = useState(null);
  const [queryResult, setQueryResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsedValue = name === 'quantity' || name === 'price' || name === 'rating' ? parseFloat(value) : value;
    setFormData(prevData => ({
      ...prevData,
      [name]: parsedValue
    }));
  };

  const handleQueryDataChange = (e) => {
    const { name, value } = e.target;
    setQueryData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3000/api/add-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        console.log('Entry added successfully');
        setPostDataAddEntry(formData);
      } else {
        console.error('Failed to add entry');
      }
    } catch (error) {
      console.error('Internal server error:', error);
    }
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`http://localhost:3000/api/query/id?id=${queryData._id_query}`);
    
      if (!response.ok) {
        throw new Error('Failed to query database');
      }
    
      const data = await response.json();
      console.log('Query result:', data);
    
      if (data.length > 0) {
        setPostDataQuery(data[0]);
        setQueryResult(data[0]);
      } else {
        setPostDataQuery(null);
        setQueryResult(null);
        console.log('No data found for the query.');
      }
    } catch (error) {
      console.error('Error querying database:', error);
    }
  };
  
  

  return (
    <div>
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
        {postDataAddEntry && (
          <div>
            <h2>Posted Data (Add Entry)</h2>
            <p>ID: {postDataAddEntry._id}</p>
            <p>Asset: {postDataAddEntry.asset}</p>
            <p>Trade: {postDataAddEntry.trade}</p>
            <p>Quantity: {postDataAddEntry.quantity}</p>
            <p>Price: {postDataAddEntry.price}</p>
            <p>Date: {postDataAddEntry.date}</p>
            <p>Rating: {postDataAddEntry.rating}</p>
          </div>
        )}
      </div>

      <div>
        <h1>Query Database</h1>
        <form onSubmit={handleQuery}>
          <label>
            User ID:
            <input type="text" name="_id_query" value={queryData._id_query} onChange={handleQueryDataChange} />
          </label>
          <br />
          <label>
            Asset:
            <input type="text" name="asset_query" value={queryData.asset_query} onChange={handleQueryDataChange} />
          </label>
          <br />
          <button type="submit">Query</button>
        </form>
        {postDataQuery && (
          <div>
            <h2>Posted Data (Query Database)</h2>
            <p>ID: {postDataQuery._id}</p>
            <p>Asset: {postDataQuery.asset}</p>
            <p>Trade: {postDataQuery.trade}</p>
            <p>Quantity: {postDataQuery.quantity}</p>
            <p>Price: {postDataQuery.price}</p>
            <p>Date: {postDataQuery.date}</p>
            <p>Rating: {postDataQuery.rating}</p>
          </div>
        )}
      </div>
    </div>
  );
}


// import { useState } from 'react';

// export default function Home() {
//   const [formData, setFormData] = useState({
//     _id: '',
//     asset: '',
//     trade: '',
//     quantity: '',
//     price: '',
//     date: '',
//     rating: ''
//   });

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     const parsedValue = name === 'quantity' || name === 'price' || name === 'rating' ? parseFloat(value) : value;
//     setFormData(prevData => ({
//       ...prevData,
//       [name]: parsedValue
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     try {
//       const response = await fetch('http://localhost:3000/api/add-entry', { // Update port to 3000
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(formData)
//       });

//       if (response.ok) {
//         console.log('Entry added successfully');
//       } else {
//         console.error('Failed to add entry');
//       }
//     } catch (error) {
//       console.error('Internal server error:', error);
//     }
//   };

//   return (
//     <div>
//       <h1>Add Entry</h1>
//       <form onSubmit={handleSubmit}>
//         <label>
//           ID:
//           <input type="text" name="_id" value={formData._id} onChange={handleChange} />
//         </label>
//         <br />
//         <label>
//           Asset:
//           <input type="text" name="asset" value={formData.asset} onChange={handleChange} />
//         </label>
//         <br />
//         <label>
//           Trade:
//           <input type="text" name="trade" value={formData.trade} onChange={handleChange} />
//         </label>
//         <br />
//         <label>
//           Quantity:
//           <input type="text" name="quantity" value={formData.quantity} onChange={handleChange} />
//         </label>
//         <br />
//         <label>
//           Price:
//           <input type="text" name="price" value={formData.price} onChange={handleChange} />
//         </label>
//         <br />
//         <label>
//           Date:
//           <input type="text" name="date" value={formData.date} onChange={handleChange} />
//         </label>
//         <br />
//         <label>
//           Rating:
//           <input type="text" name="rating" value={formData.rating} onChange={handleChange} />
//         </label>
//         <br />
//         <button type="submit">Submit</button>
//       </form>
//     </div>
//   );
// }
