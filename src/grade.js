// Runs a learner's query for one step of a lesson and decides pass or fail, in the learner's stack.
const sandbox = require('./sandbox');
const { stepSpec, lessonFor } = require('./lessons');
const { check } = require('./check');
const { dialectOf } = require('./dialects');

const v = (pass, headline, detail) => ({ pass, headline, detail, extraRows: [] });

async function grade(baseLesson, step, sql, dialect) {
  dialect = dialectOf(dialect);
  const lesson = lessonFor(baseLesson, dialect);
  const spec = stepSpec(lesson, step);
  const text = String(sql || '');
  const started = Date.now();
  const user = await sandbox.run(text, dialect);
  const ms = Date.now() - started;
  const result = user.error ? { error: user.error, ...(user.hint ? { hint: user.hint } : {}), ms }
    : { columns: user.columns, rows: user.rows, truncated: user.truncated, ms };

  if (spec.expectError) {
    if (user.error && spec.expectError.test(user.error)) return { ...result, verdict: v(true, 'That’s the error we wanted.') };
    if (!user.error) return { ...result, verdict: v(false, 'That ran fine. For this step, leave the quotes off on purpose.', 'Seeing the error once means you’ll recognise it on Monday.') };
    return { ...result, verdict: v(false, user.error, 'Not quite the mistake we’re after. Follow the step exactly.') };
  }
  if (user.error) return result;
  const banned = dialect === 'tsql' ? 'TOP' : 'LIMIT';
  if (spec.noTop && new RegExp(`\\b${banned}\\b`, 'i').test(text.replace(/--[^\n]*/g, ''))) {
    return { ...result, verdict: v(false, `The panel said no ${banned}.`, 'Find it with MAX and a subquery instead.') };
  }
  if (spec.loose) {
    const cols = user.columns.map((c) => c.toLowerCase());
    return { ...result, verdict: spec.loose.every((c) => cols.includes(c)) ? v(true, 'Ran.')
      : v(false, `Call the column ${spec.loose.join(', ')}.`, spec.looseFix || `Add AS ${spec.loose[0]} after GETDATE().`) };
  }
  const expected = await sandbox.run(spec.solution, dialect);
  if (expected.error) throw new Error(`Lesson ${lesson.id} solution is broken in ${dialect}: ${expected.error}`);
  return { ...result, verdict: check(spec, user, expected, { today: await sandbox.today(), sql: text, dialect }) };
}

module.exports = { grade };
