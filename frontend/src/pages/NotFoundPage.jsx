import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Button } from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-grey-50 flex flex-col items-center justify-center p-4 text-center">
      <FileQuestion className="h-12 w-12 text-grey-300 mb-4" />
      <h1 className="text-lg font-semibold text-grey-900 mb-2">Page not found</h1>
      <p className="text-sm text-grey-500 mb-6">The page you are looking for does not exist.</p>
      <Link to="/"><Button variant="secondary">Go home</Button></Link>
    </div>
  );
}
