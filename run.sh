#!/bin/bash

# Exit on error
set -e

# Function to display usage
usage() {
  echo "The Set - Music Event App"
  echo ""
  echo "Usage: ./run.sh [command]"
  echo ""
  echo "Commands:"
  echo "  dev           Start development servers (frontend + API)"
  echo "  build         Build both frontend and API for production"
  echo "  start         Start the production servers"
  echo "  migrate       Apply database migrations"
  echo "  clear-cache   Clear the API cache"
  echo "  help          Display this help message"
  echo ""
  exit 1
}

# Check if command is provided
if [ $# -eq 0 ]; then
  usage
fi

# Execute command
case "$1" in
  dev)
    echo "Starting development servers..."
    npm run dev
    ;;
  build)
    echo "Building for production..."
    npm run build:all
    ;;
  start)
    echo "Starting production servers..."
    npm start
    ;;
  migrate)
    echo "Applying database migrations..."
    npm run db:migration:apply
    ;;
  clear-cache)
    echo "Clearing API cache..."
    npm run reset:cache
    ;;
  help)
    usage
    ;;
  *)
    echo "Unknown command: $1"
    usage
    ;;
esac 