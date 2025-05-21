import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  details?: string;
  duration?: number;
}

const TestDatabaseIntegration = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [overallResult, setOverallResult] = useState<{ success: boolean; message: string } | null>(null);

  const runTests = async () => {
    setLoading(true);
    setResults([]);
    setOverallResult(null);

    try {
      // Call our test integration API endpoint
      const response = await fetch('/api/test-db-integration');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.tests && Array.isArray(data.tests)) {
        setResults(data.tests);
      }
      
      setOverallResult({
        success: data.success,
        message: data.message || (data.success ? 'All tests passed' : 'Some tests failed')
      });
    } catch (error) {
      console.error('Error running database tests:', error);
      setOverallResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Test Database Integration</h2>
        <Button 
          onClick={runTests} 
          disabled={loading}
          className="gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Run Tests
        </Button>
      </div>
      
      {overallResult && (
        <Alert 
          className={
            overallResult.success 
              ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300" 
              : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"
          }
        >
          <div className="flex items-center gap-2">
            {overallResult.success 
              ? <CheckCircle className="h-5 w-5" /> 
              : <AlertCircle className="h-5 w-5" />}
            <AlertTitle>{overallResult.success ? "Success" : "Error"}</AlertTitle>
          </div>
          <AlertDescription>{overallResult.message}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Database Integration Tests</CardTitle>
          <CardDescription>
            Tests that verify the integration between the app and the Supabase database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Running database tests...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{result.name}</h3>
                    <Badge 
                      variant={result.success ? "default" : "destructive"}
                      className="flex items-center gap-1"
                    >
                      {result.success 
                        ? <CheckCircle className="h-3 w-3" /> 
                        : <AlertCircle className="h-3 w-3" />}
                      {result.success ? 'Passed' : 'Failed'}
                    </Badge>
                  </div>
                  
                  {result.details && (
                    <p className="text-sm text-muted-foreground mt-1">{result.details}</p>
                  )}
                  
                  {result.error && (
                    <div className="mt-2 text-sm p-2 rounded bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                      {result.error}
                    </div>
                  )}
                  
                  {result.duration !== undefined && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Duration: {result.duration}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Run the tests to check database integration</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start">
          <Separator className="my-2" />
          <div className="text-sm text-muted-foreground">
            <h4 className="font-semibold mb-1">What these tests check:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Connection to Supabase database</li>
              <li>Ability to save artists to the database</li>
              <li>Ability to save venues to the database</li>
              <li>Ability to save shows to the database</li>
              <li>Automatic creation of setlists with songs</li>
              <li>Authentication and permissions</li>
            </ul>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TestDatabaseIntegration;
