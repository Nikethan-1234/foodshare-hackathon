import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { Button } from "../components/ui/Button";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-grey-50 flex flex-col items-center justify-center p-4 text-center">
      <ShieldOff className="h-12 w-12 text-grey-300 mb-4" />
      <h1 className="text-lg font-semibold text-grey-900 mb-2">Access denied</h1>
      <p className="text-sm text-grey-500 mb-6">You do not have permission to view this page.</p>
      <Link to="/"><Button variant="secondary">Go home</Button></Link>
    </div>
  );
}
