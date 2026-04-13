# Local Notes Microservice App

This folder contains the Phase 1 app requested in the assignment:

- `backend/` - Node.js + Express API
- `frontend/` - React UI served by Nginx
- `docker-compose.yml` - local Docker runtime for all three services
- `k8s/` - Kubernetes manifests for the same stack, including PostgreSQL

## What it does

The app is a small notes system:

- create notes with a title and body
- list saved notes
- delete notes
- store everything in PostgreSQL

The frontend calls the backend through `/api`, and Nginx proxies that path to the API service. That keeps the browser code simple and lets the same frontend image work in Docker and Kubernetes.

## Run locally with Docker

From this directory:

```bash
docker compose up --build
```

Open the UI at:

```text
http://localhost:3000
```

API endpoints:

- `GET /health`
- `GET /api/health`
- `GET /api/notes`
- `POST /api/notes`
- `DELETE /api/notes/:id`

To stop and remove the database volume too:

```bash
docker compose down -v
```

## Run locally with Kubernetes

The manifests in `k8s/` create:

- a PostgreSQL `StatefulSet`
- backend and frontend workloads
- a dedicated namespace named `microservice-app`

Build the images first:

```bash
docker build -t notes-backend:local ./backend
docker build -t notes-frontend:local ./frontend
```

If you are using `kind`, load the images into the cluster:

```bash
kind load docker-image notes-backend:local notes-frontend:local
```

If you are using `minikube`, load them with:

```bash
minikube image load notes-backend:local
minikube image load notes-frontend:local
```

Apply the manifests:

```bash
kubectl apply -k k8s
```

Open the frontend with port-forwarding:

```bash
kubectl port-forward svc/frontend 3000:80 -n microservice-app
```

Then visit:

```text
http://localhost:3000
```

## Notes

- PostgreSQL credentials in Docker Compose and Kubernetes are intentionally simple for a local demo.
- The backend waits for PostgreSQL to become available before it starts serving traffic.
- The frontend uses a single API path prefix, so the browser never needs to know where the backend lives.
