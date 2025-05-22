import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import ArtistSearch from '@/components/ArtistSearch';

describe("Artist Search Flow", () => {
  it("should display search results when a search term is entered", async () => {
    render(<ArtistSearch />);
    const searchInput = screen.getByPlaceholderText(/search artist/i);
    fireEvent.change(searchInput, { target: { value: "Test Artist" } });
    const result = await screen.findByText("Test Artist");
    expect(result).toBeInTheDocument();
  });
});