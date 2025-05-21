import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Music, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const signupSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }).optional(),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

interface LocationState {
  from?: {
    pathname: string;
  };
}

const Auth = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const { 
    isAuthenticated, 
    isLoading, 
    loginWithEmail, 
    loginWithGoogle, 
    loginWithSpotify, 
    signup 
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const from = state?.from?.pathname || '/';

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onLoginSubmit = async (values: LoginFormValues) => {
    await loginWithEmail(values.email, values.password);
  };

  const onSignupSubmit = async (values: SignupFormValues) => {
    await signup(values.email, values.password, values.username);
  };

  const handleLoginWithGoogle = () => {
    loginWithGoogle();
  };

  const handleLoginWithSpotify = () => {
    loginWithSpotify();
  };

  if (isAuthenticated && !isLoading) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 flex items-center justify-center rounded-full mb-2">
              <Music className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to TheSet</CardTitle>
            <CardDescription>
              Sign in to vote on setlists for your favorite artists' shows
            </CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="login" value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
            <TabsList className="grid grid-cols-2 mx-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-black"
                  onClick={handleLoginWithGoogle}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full bg-[#1DB954] hover:bg-[#1DB954]/90 text-white"
                  onClick={handleLoginWithSpotify}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 0C4.477 0 0 4.477 0 10c0 5.523 4.477 10 10 10 5.523 0 10-4.477 10-10 0-5.523-4.477-10-10-10zm4.586 14.424a.622.622 0 01-.858.205c-2.346-1.435-5.304-1.76-8.786-.964a.622.622 0 01-.277-1.215c3.809-.87 7.077-.496 9.713 1.116a.623.623 0 01.208.858zm1.223-2.722a.78.78 0 01-1.072.257c-2.687-1.652-6.786-2.13-9.965-1.166a.78.78 0 01-.973-.519.781.781 0 01.519-.972c3.642-1.106 8.146-.569 11.234 1.327a.78.78 0 01.257 1.073zm.105-2.835c-3.223-1.914-8.54-2.09-11.618-1.156a.935.935 0 11-.542-1.79c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 01-.955 1.608z" />
                  </svg>
                  Continue with Spotify
                </Button>
                
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
              </div>
              
              <TabsContent value="login" className="mt-4">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="Enter your email" 
                                className="pl-10" 
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="password" 
                                placeholder="Enter your password" 
                                className="pl-10" 
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full mt-2"
                      disabled={isLoading || loginForm.formState.isSubmitting}
                    >
                      {isLoading || loginForm.formState.isSubmitting ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Please wait...
                        </span>
                      ) : "Log in"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-4">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username (optional)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="Choose a username" 
                                className="pl-10" 
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="Enter your email" 
                                className="pl-10" 
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="password" 
                                placeholder="Create a password" 
                                className="pl-10" 
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="password" 
                                placeholder="Confirm your password" 
                                className="pl-10" 
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full mt-2"
                      disabled={isLoading || signupForm.formState.isSubmitting}
                    >
                      {isLoading || signupForm.formState.isSubmitting ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </span>
                      ) : "Sign up"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </CardContent>
          </Tabs>
          
          <CardFooter className="flex flex-col space-y-4 border-t pt-4">
            <div className="text-center text-sm text-muted-foreground">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </div>
          </CardFooter>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default Auth;
