declare global {
  var describe: any;
  var test: any;
  var expect: any;
}
import "@testing-library/jest-dom/extend-expect";
import { render, screen } from "@testing-library/react";
import AdminDashboard from "@/components/admin/AdminDashboard";

describe("AdminDashboard", () => {
  test("renders the header", () => {
    render(<AdminDashboard />);
    const headerElement = screen.getByText(/Admin Dashboard/i);
    expect(headerElement).toBeInTheDocument();
  });
});