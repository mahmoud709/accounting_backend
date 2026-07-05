const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return res.status(422).json({
      success: false,
      message: 'فشل التحقق من البيانات',
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  req[source] = result.data;
  next();
};

module.exports = validate;
