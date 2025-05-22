import React, { useState } from "react";

const ArtistSearch: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    if (term) {
      // Simulate an API call returning a result that includes the searched term.
      setResults([term]);
    } else {
      setResults([]);
    }
  };

  return (
    <div>
      <input placeholder="Search Artist" onChange={handleSearch} />
      <ul>
        {results.map((artist, idx) => (
          <li key={idx}>{artist}</li>
        ))}
      </ul>
    </div>
  );
};

export default ArtistSearch;