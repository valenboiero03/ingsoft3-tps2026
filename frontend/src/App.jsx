import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [servicios, setServicios] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/servicios')
      .then((res) => res.json())
      .then((data) => setServicios(data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Catálogo de servicios</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <ul>
        {servicios.map((s) => (
          <li key={s.id}>
            {s.nombre} — {s.duracion_minutos} min — ${s.precio}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;