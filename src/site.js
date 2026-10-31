// Who's who on the site. One place to edit.
//
// reviewer: the senior DBA whose short notes mark every query ("You've included today.").
//           This is the person you learned SQL Server sitting next to. Set their first name here
//           (or REVIEWER_NAME) and it appears on every mark and on the homepage About line.
// founder:  your first name for the homepage note (or FOUNDER_NAME). Empty signs it "the founder".

module.exports = {
  reviewer: { first: process.env.REVIEWER_NAME || '', role: 'Senior DBA' },
  founder: { first: process.env.FOUNDER_NAME || '' },
};
