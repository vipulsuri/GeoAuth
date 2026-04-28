import { useState } from 'react'

function App() {
  const [address, setAddress] = useState('');
  const [specialty, setSpecialty] = useState('Cardiology');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, specialty }),
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        const isHtml = responseText.trim().startsWith('<');
        let detailedError = `Server returned an invalid response. Status Code: ${response.status}. `;
        
        if (response.status === 404 && isHtml) {
          detailedError += "Vercel returned a 404 Not Found page. This means Vercel isn't routing the request to the backend correctly. Make sure your 'Root Directory' setting in the Vercel dashboard is left BLANK (do not set it to 'frontend').";
        } else if (response.status === 500 && isHtml) {
          detailedError += "Vercel returned a 500 Internal Server Error page. This usually means the backend crashed or failed to connect to the database. Check your Vercel Function Logs for details.";
        } else {
          detailedError += `Response preview: ${responseText.substring(0, 150)}...`;
        }
        
        throw new Error(detailedError);
      }

      if (!response.ok) {
        const errorMsg = data.details ? `${data.error} Details: ${data.details}` : data.error;
        throw new Error(errorMsg || `Server returned error code ${response.status}`);
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>GeoReferral</h1>
        <p className="subtitle">Geography-Aware Provider Routing</p>
      </header>

      <main>
        <section className="search-section">
          <form onSubmit={handleSubmit} className="form-group">
            <div className="input-row">
              <div className="input-field">
                <label htmlFor="address">Patient Address</label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Albuquerque, NM"
                  required
                />
              </div>
              <div className="input-field">
                <label htmlFor="specialty">Specialty Needed</label>
                <select
                  id="specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Orthopedics">Orthopedics</option>
                </select>
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Routing...' : 'Find Best Route'}
            </button>
          </form>
        </section>

        {loading && (
          <div className="loader">
            <div className="spinner"></div>
          </div>
        )}

        {error && (
          <div className="error-message" style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.75rem', border: '1px solid #f87171', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Oops! Something went wrong
            </div>
            <p style={{ margin: 0, lineHeight: '1.6', fontSize: '0.95rem' }}>{error}</p>
          </div>
        )}

        {results && results.providers && (
          <section className="results-container" style={{ marginTop: '2rem' }}>
            <div className="results-header">
              <h2>Recommended Providers</h2>
              <span className="results-count">
                {results.providers.length} found
              </span>
            </div>

            {results.providers.length === 0 ? (
              <p>No providers found near this location for the selected specialty.</p>
            ) : (
              results.providers.map((provider, index) => {
                const isBestMatch = index === 0;
                return (
                  <div key={provider.id} className={`provider-card ${isBestMatch ? 'best-match' : ''}`}>
                    <div className="provider-info">
                      <h3>{provider.name}</h3>
                      <span className="provider-specialty">{provider.specialty}</span>
                      <div className="provider-address">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        {provider.address}
                      </div>
                      {isBestMatch && (
                        <div style={{ marginTop: '0.5rem', color: '#34d399', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          ✓ Fastest Route Selected
                        </div>
                      )}

                      {provider.insights && provider.insights.length > 0 && (
                        <div className="provider-insights">
                          <h4 style={{fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '1rem', marginBottom: '0.25rem'}}>Routing Nuances:</h4>
                          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
                            {provider.insights.map((insight, i) => (
                              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <span style={{ color: '#818cf8' }}>ℹ</span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="provider-stats">
                      {provider.driving_duration_min !== null ? (
                        <>
                          <div className="stat-group">
                            <span className="stat-value duration">
                              {provider.driving_duration_min} min
                            </span>
                            <span className="stat-label">Driving Time</span>
                          </div>
                          <div className="stat-group">
                            <span className="stat-value">
                              {provider.driving_distance_miles} mi
                            </span>
                            <span className="stat-label">Distance</span>
                          </div>
                        </>
                      ) : (
                        <div className="stat-group">
                          <span className="stat-value" style={{color: '#fbbf24'}}>Routing Failed</span>
                          <span className="stat-label">
                            Straight line: {(provider.straight_line_distance_meters / 1609.34).toFixed(1)} mi
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
