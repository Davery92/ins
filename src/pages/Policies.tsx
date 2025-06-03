import React from 'react';

const Policies: React.FC = () => {
  const handleTestClick = () => {
    alert('TEST BUTTON WORKS!');
    console.log('TEST BUTTON CLICKED!');
  };

  return (
    <div style={{ padding: '20px', backgroundColor: 'white', color: 'black' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>POLICIES PAGE - MINIMAL TEST</h1>
      
      <button 
        onClick={handleTestClick}
        style={{
          backgroundColor: 'red',
          color: 'white',
          padding: '10px 20px',
          fontSize: '16px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        🧪 BIG RED TEST BUTTON
      </button>
      
      <div style={{ backgroundColor: '#f0f0f0', padding: '10px', marginTop: '20px' }}>
        <p>If you can see this text and the red button above, React is working.</p>
        <p>Click the red button to test JavaScript functionality.</p>
      </div>
    </div>
  );
};

export default Policies; 