// Parse body with zod schema
export const validate = (schema, src = 'body') => (req, res, next) => {
  const r = schema.safeParse(req[src]);
  if (!r.success) return res.status(422).json({ message: 'Validation failed', errors: r.error.flatten().fieldErrors });
  req[src] = r.data;
  next();
};
