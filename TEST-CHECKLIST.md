# CREST Quick Test Checklist

## Demo login

- Username: `rahul`
- Password: `1234`

## Test sequence

### Login
- [ ] Login succeeds.
- [ ] Dashboard opens.
- [ ] Username and department appear in the shell.

### Dashboard
- [ ] Total / Completed / Pending / Overdue cards appear.
- [ ] Today's tasks appear.
- [ ] View all opens My Tasks.

### My Tasks
- [ ] Search `Daily Report`.
- [ ] Filter Checklist.
- [ ] Filter Delegation.
- [ ] Clear filters.

### Delegation
- [ ] Current tab shows delegated tasks.
- [ ] Select a task.
- [ ] Enter a remark.
- [ ] Mark Done.
- [ ] Open History.
- [ ] Completion record appears.

### Assign Task
- [ ] Create a Delegation task for `rahul`.
- [ ] Return to My Tasks.
- [ ] New task appears.

### Completion Confirmation
- [ ] Select one task and click Submit Selected.
- [ ] Confirmation popup shows Task Name, Planned Date, Actual Date and Status.
- [ ] Responsibility checkbox is required.
- [ ] Cancel leaves tasks unchanged.
- [ ] Multiple early tasks use one confirmation popup.
- [ ] Daily task before planned date is blocked.
- [ ] Weekly/Monthly/Yearly/One-Time/Delegation early completion is allowed.

### Calendar
- [ ] Open Calendar.
- [ ] Move between months.
- [ ] Click a date.
- [ ] Task details appear.

### Reports
- [ ] Operational totals load.
- [ ] Score boundary is visible.
- [ ] No fake production score is calculated.

### Responsive UI
- [ ] Resize to tablet width.
- [ ] Resize to mobile width.
- [ ] Bottom navigation appears.
- [ ] No horizontal page scrolling.

## Expected demo behavior

All writes are stored in browser localStorage. Refreshing the page keeps them. Removing `crest_demo_store_v1` resets the demo database.
