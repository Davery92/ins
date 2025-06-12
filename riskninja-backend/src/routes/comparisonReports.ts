import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkLicense } from '../middleware/checkLicense';
import { ComparisonReportModel } from '../models';

const router = Router();

// GET /comparison-reports - Get all comparison reports for the authenticated user
router.get('/', authenticateToken, checkLicense, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const reports = await ComparisonReportModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      attributes: [
        'id',
        'title',
        'content',
        'documentNames',
        'documentIds',
        'primaryPolicyType',
        'additionalFacts',
        'createdAt'
      ]
    });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching comparison reports:', error);
    res.status(500).json({ error: 'Failed to fetch comparison reports' });
  }
});

// POST /comparison-reports - Save a new comparison report
router.post('/', authenticateToken, checkLicense, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, content, documentNames, documentIds, primaryPolicyType, additionalFacts } = req.body;

    if (!title || !content || !documentNames || !documentIds || !primaryPolicyType) {
      res.status(400).json({ 
        error: 'Missing required fields: title, content, documentNames, documentIds, primaryPolicyType' 
      });
      return;
    }

    const comparisonReport = await ComparisonReportModel.create({
      userId,
      title,
      content,
      documentNames,
      documentIds,
      primaryPolicyType,
      additionalFacts: additionalFacts || null,
    });

    res.status(201).json({
      id: comparisonReport.id,
      title: comparisonReport.title,
      content: comparisonReport.content,
      documentNames: comparisonReport.documentNames,
      documentIds: comparisonReport.documentIds,
      primaryPolicyType: comparisonReport.primaryPolicyType,
      additionalFacts: comparisonReport.additionalFacts,
      createdAt: comparisonReport.createdAt,
    });
  } catch (error) {
    console.error('Error saving comparison report:', error);
    res.status(500).json({ error: 'Failed to save comparison report' });
  }
});

// GET /comparison-reports/:id - Get a specific comparison report by ID
router.get('/:id', authenticateToken, checkLicense, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const report = await ComparisonReportModel.findOne({
      where: { 
        id,
        userId // Ensure user can only access their own reports
      },
      attributes: [
        'id',
        'title',
        'content',
        'documentNames',
        'documentIds',
        'primaryPolicyType',
        'additionalFacts',
        'createdAt'
      ]
    });

    if (!report) {
      res.status(404).json({ error: 'Comparison report not found' });
      return;
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching comparison report:', error);
    res.status(500).json({ error: 'Failed to fetch comparison report' });
  }
});

// DELETE /comparison-reports/:id - Delete a comparison report
router.delete('/:id', authenticateToken, checkLicense, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const deleted = await ComparisonReportModel.destroy({
      where: { 
        id,
        userId // Ensure user can only delete their own reports
      }
    });

    if (!deleted) {
      res.status(404).json({ error: 'Comparison report not found' });
      return;
    }

    res.json({ message: 'Comparison report deleted successfully' });
  } catch (error) {
    console.error('Error deleting comparison report:', error);
    res.status(500).json({ error: 'Failed to delete comparison report' });
  }
});

export default router; 