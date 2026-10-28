import { z } from 'zod';
import { required, maxLength } from '@/utils/validation';

/** Fields shared by the create and edit task forms (mirror the API's task rules) */
export const taskFormSchema = z.object({
  title: required('Title').pipe(maxLength('Title', 300)),
  description: maxLength('Description', 5000),
  assignedTo: z.string().min(1, 'Select who to assign this task to'),
  dueDate: z.string().min(1, 'Select a due date'),
});

export const createTaskSchema = taskFormSchema.extend({
  entity: z.string().min(1, 'Select an entity'),
});
