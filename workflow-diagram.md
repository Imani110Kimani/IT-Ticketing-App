# IT Ticketing System Workflow Diagram

```mermaid
flowchart TD
  A[Employee] -->|Create Ticket| B[Frontend App]
  B -->|POST /api/tickets| C[Backend API]
  C -->|Auto-assign based on schedule + workload| D[Ticket Assignment Engine]
  D -->|Select IT Staff| E[Database: tickets/users]
  E -->|Create Ticket + Comment| F[Ticket Record]
  
  subgraph IT_Dashboard[IT Dashboard]
    G[IT Staff / IT Admin]
    H[Frontend App]
  end
  G -->|View tickets| H
  G -->|View workload + schedule| H
  H -->|GET /api/tickets, /api/staff| C
  H -->|PATCH /api/tickets/:id| C
  C -->|Validate assignee is `it_staff`| E
  C -->|Update ticket status/assignee| F

  classDef itRole fill:#d8ebff,stroke:#5b8ac6;
  class C,D,E,F,H itRole;
  class A,G fill:#f4f4f4,stroke:#999;
```

## Diagram explanation

- Employees create tickets through the frontend.
- The backend automatically assigns tickets only to valid `it_staff` members, using schedule and current workload.
- IT staff and IT admin use the dashboard to view tickets and staff schedules.
- Ticket updates are validated by the backend to ensure assignments are only made to staff in the database.
