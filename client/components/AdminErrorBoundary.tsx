import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  ArrowLeft, 
  Home,
  Copy,
  CheckCircle
} from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      copied: false 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error, 
      errorInfo: null,
      copied: false 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('AdminErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      copied: false 
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleGoBack = () => {
    window.history.back();
  };

  copyErrorToClipboard = async () => {
    const { error, errorInfo } = this.state;
    const errorText = `
Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error('Failed to copy error to clipboard:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      const { error, errorInfo } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl shadow-lg">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">
                    Erreur de l'application
                  </CardTitle>
                  <p className="text-gray-600 mt-1">
                    Une erreur inattendue s'est produite dans l'administration
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Error Alert */}
                <Alert className="border-red-200 bg-red-50">
                  <Bug className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Erreur détectée:</strong> {error?.message || 'Erreur inconnue'}
                  </AlertDescription>
                </Alert>

                {/* Suggested Actions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Actions suggérées
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      onClick={this.handleRetry}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Réessayer
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={this.handleGoBack}
                      className="w-full hover:bg-gray-50"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Retour
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={this.handleGoHome}
                      className="w-full hover:bg-gray-50"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Accueil
                    </Button>
                  </div>
                </div>

                {/* System Information */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Informations système</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Timestamp:</span>
                      <span className="text-gray-900 font-mono">{new Date().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Page:</span>
                      <span className="text-gray-900 font-mono">{window.location.pathname}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Environnement:</span>
                      <Badge variant={isDevelopment ? "destructive" : "secondary"}>
                        {isDevelopment ? 'Développement' : 'Production'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Error Details (Development only) */}
                {isDevelopment && error && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Détails de l'erreur</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={this.copyErrorToClipboard}
                        className="text-xs"
                      >
                        {this.state.copied ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3 text-green-600" />
                            Copié
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3 w-3" />
                            Copier
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-64">
                      <pre className="text-xs whitespace-pre-wrap">
                        <strong>Error:</strong> {error.message}
                        {error.stack && (
                          <>
                            {'\n\n'}<strong>Stack Trace:</strong>
                            {'\n'}{error.stack}
                          </>
                        )}
                        {errorInfo?.componentStack && (
                          <>
                            {'\n\n'}<strong>Component Stack:</strong>
                            {'\n'}{errorInfo.componentStack}
                          </>
                        )}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Support Information */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Besoin d'aide ?</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Si le problème persiste, contactez l'équipe de support avec les informations ci-dessus.
                  </p>
                  <div className="flex space-x-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      ID d'erreur: {error?.name || 'UnknownError'}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      Timestamp: {Date.now()}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC to wrap components with error boundary
export const withAdminErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallbackComponent?: ReactNode
) => {
  return (props: P) => (
    <AdminErrorBoundary fallbackComponent={fallbackComponent}>
      <Component {...props} />
    </AdminErrorBoundary>
  );
};

// Hook to handle async errors in components
export const useAsyncError = () => {
  const [, setError] = React.useState();
  return React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    [setError]
  );
};
