
import React, { useState, useEffect } from 'react';
import { runUserJourneyTest } from '@/tests/userJourneyTest';
import type { TestResults } from '@/tests/journey/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface UserJourneyTestProps {
  customArtistId?: string;
  customArtistName?: string;
}

const UserJourneyTest: React.FC<UserJourneyTestProps> = ({ customArtistId, customArtistName }) => {
  const [results, setResults] = useState<TestResults | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (customArtistId) {
      setResults(null);
    }
    
    return () => {
      // Intentionally left empty
    };
  }, [customArtistId]);

  const handleRunTest = async () => {
    setRunning(true);
    setResults(null);
    
    try {
      console.log(`Running test with artist ID: ${customArtistId || 'default'}`);
      const testResults = await runUserJourneyTest(customArtistId);
      setResults(testResults);
    } catch (error) {
      console.error('Error running test:', error);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          User Journey Test
          {results && (
            <Badge 
              variant={results.errors.length === 0 ? "default" : "destructive"}
              className="ml-2"
            >
              {results.errors.length === 0 ? 'All Tests Passed' : `${results.errors.length} Errors`}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Tests the user journey from artist search to voting on setlists
          {customArtistName && <span className="font-semibold ml-1">for {customArtistName}</span>}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {running ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin mb-4" />
            <p className="text-center text-muted-foreground">Running user journey test...</p>
          </div>
        ) : results ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-background rounded-lg border">
                <div className="text-sm font-medium text-muted-foreground mb-1">Start Time</div>
                <div>{results.startTime.toLocaleTimeString()}</div>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <div className="text-sm font-medium text-muted-foreground mb-1">End Time</div>
                <div>{results.endTime?.toLocaleTimeString() || 'N/A'}</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Success Log ({results.successes.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-lg bg-background">
                {results.successes.length > 0 ? (
                  results.successes.map((success, i) => (
                    <div key={i} className="text-sm p-2 border-l-4 border-green-500 pl-2 bg-green-500/5">
                      <span className="font-medium">{success.step}:</span> {success.message}
                    </div>
                  ))
                ) : (
                  <div className="text-sm p-2">No successes logged</div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Error Log ({results.errors.length})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-lg bg-background">
                {results.errors.length > 0 ? (
                  results.errors.map((error, i) => (
                    <div key={i} className="text-sm p-2 border-l-4 border-destructive pl-2 bg-destructive/5">
                      <div className="font-medium">{error.step} ({error.source})</div>
                      <div>{error.message}</div>
                      {error.details && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer">View details</summary>
                          <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
                            {JSON.stringify(error.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm p-2">No errors detected</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground mb-4">
              Click the button below to run the automated user journey test
              {customArtistName && <span> for {customArtistName}</span>}
            </p>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleRunTest} 
          disabled={running}
          className="w-full"
        >
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Test...
            </>
          ) : (
            'Run User Journey Test'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UserJourneyTest;
