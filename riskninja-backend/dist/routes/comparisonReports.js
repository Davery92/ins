"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const checkLicense_1 = require("../middleware/checkLicense");
const models_1 = require("../models");
const router = (0, express_1.Router)();
// GET /comparison-reports - Get all comparison reports for the authenticated user
router.get('/', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const reports = await models_1.ComparisonReportModel.findAll({
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
                'customerId',
                'createdAt'
            ]
        });
        res.json(reports);
    }
    catch (error) {
        console.error('Error fetching comparison reports:', error);
        res.status(500).json({ error: 'Failed to fetch comparison reports' });
    }
});
// POST /comparison-reports - Save a new comparison report
router.post('/', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, content, documentNames, documentIds, primaryPolicyType, additionalFacts, customerId } = req.body;
        if (!title || !content || !documentNames || !documentIds || !primaryPolicyType) {
            res.status(400).json({
                error: 'Missing required fields: title, content, documentNames, documentIds, primaryPolicyType'
            });
            return;
        }
        const comparisonReport = await models_1.ComparisonReportModel.create({
            userId,
            customerId: customerId || null,
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
            customerId: comparisonReport.customerId,
            createdAt: comparisonReport.createdAt,
        });
    }
    catch (error) {
        console.error('Error saving comparison report:', error);
        res.status(500).json({ error: 'Failed to save comparison report' });
    }
});
// GET /comparison-reports/:id - Get a specific comparison report by ID
router.get('/:id', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const report = await models_1.ComparisonReportModel.findOne({
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
                'customerId',
                'createdAt'
            ]
        });
        if (!report) {
            res.status(404).json({ error: 'Comparison report not found' });
            return;
        }
        res.json(report);
    }
    catch (error) {
        console.error('Error fetching comparison report:', error);
        res.status(500).json({ error: 'Failed to fetch comparison report' });
    }
});
// GET /comparison-reports/customer/:customerId - Get comparison reports for a specific customer
router.get('/customer/:customerId', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { customerId } = req.params;
        // Verify the customer belongs to the user
        const customer = await models_1.ComparisonReportModel.sequelize?.models.Customer.findOne({
            where: { id: customerId, userId }
        });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        const reports = await models_1.ComparisonReportModel.findAll({
            where: {
                userId,
                customerId
            },
            order: [['createdAt', 'DESC']],
            attributes: [
                'id',
                'title',
                'content',
                'documentNames',
                'documentIds',
                'primaryPolicyType',
                'additionalFacts',
                'customerId',
                'createdAt'
            ]
        });
        res.json(reports);
    }
    catch (error) {
        console.error('Error fetching customer comparison reports:', error);
        res.status(500).json({ error: 'Failed to fetch customer comparison reports' });
    }
});
// DELETE /comparison-reports/:id - Delete a comparison report
router.delete('/:id', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const deleted = await models_1.ComparisonReportModel.destroy({
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
    }
    catch (error) {
        console.error('Error deleting comparison report:', error);
        res.status(500).json({ error: 'Failed to delete comparison report' });
    }
});
exports.default = router;
//# sourceMappingURL=comparisonReports.js.map