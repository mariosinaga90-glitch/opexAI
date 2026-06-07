import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, fundRequests, requestItems, requestSites, fundReports, reportItems, attachments } from '../../db/schema.js';

export async function deleteUserTrace(id) {
  try {
    console.log(`Tracing delete for user ${id}`);
    
    // Get all report IDs for this user
    const userReps = await db.select({ id: fundReports.id }).from(fundReports).where(eq(fundReports.userId, id));
    let repIds = userReps.map(r => r.id);
    console.log(`User reports: ${repIds}`);

    // Get all request IDs for this user
    const userReqs = await db.select({ id: fundRequests.id }).from(fundRequests).where(eq(fundRequests.userId, id));
    const reqIds = userReqs.map(r => r.id);
    console.log(`User requests: ${reqIds}`);

    if (reqIds.length > 0) {
      const relatedReps = await db.select({ id: fundReports.id }).from(fundReports).where(inArray(fundReports.requestId, reqIds));
      const relatedRepIds = relatedReps.map(r => r.id);
      console.log(`Related reports (from requests): ${relatedRepIds}`);
      repIds = [...new Set([...repIds, ...relatedRepIds])];
    }

    console.log(`Total reports to delete: ${repIds}`);

    // Cascade delete reports
    if (repIds.length > 0) {
      console.log('Deleting reportItems...');
      await db.delete(reportItems).where(inArray(reportItems.reportId, repIds));
      console.log('Deleting attachments for reports...');
      await db.delete(attachments).where(inArray(attachments.reportId, repIds));
      console.log('Deleting fundReports...');
      await db.delete(fundReports).where(inArray(fundReports.id, repIds));
    }

    // Cascade delete requests
    if (reqIds.length > 0) {
      console.log('Deleting requestItems...');
      await db.delete(requestItems).where(inArray(requestItems.requestId, reqIds));
      console.log('Deleting requestSites...');
      await db.delete(requestSites).where(inArray(requestSites.requestId, reqIds));
      console.log('Deleting attachments for requests...');
      await db.delete(attachments).where(inArray(attachments.requestId, reqIds));
      console.log('Deleting fundRequests...');
      await db.delete(fundRequests).where(inArray(fundRequests.id, reqIds));
    }

    // Delete user
    console.log('Deleting user...');
    await db.delete(users).where(eq(users.id, id));
    console.log('User deleted successfully.');
  } catch (error) {
    console.error('ERROR TRACE:', error);
  }
}
