"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUnderwritingReport = exports.getUnderwritingReports = void 0;
const models_1 = require("../models");
// Get all underwriting reports for a specific customer
const getUnderwritingReports = async (req, res) => {
    const userId = req.user.id;
    const customerId = req.params.id;
    try {
        // Verify customer belongs to user
        const customer = await models_1.CustomerModel.findOne({ where: { id: customerId, userId } });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        const reports = await models_1.UnderwritingReportModel.findAll({
            where: { customerId, userId },
            order: [['createdAt', 'DESC']]
        });
        res.json(reports);
    }
    catch (error) {
        console.error('Error fetching underwriting reports:', error);
        res.status(500).json({ error: 'Failed to fetch underwriting reports' });
    }
};
exports.getUnderwritingReports = getUnderwritingReports;
// Create a new underwriting report for a specific customer
const createUnderwritingReport = async (req, res) => {
    const reporterId = req.user.id;
    const customerId = req.params.id;
    const { title, content } = req.body;
    if (!title || !content) {
        res.status(400).json({ error: 'Title and content are required' });
        return;
    }
    try {
        // Verify customer belongs to user
        const customer = await models_1.CustomerModel.findOne({ where: { id: customerId, userId: reporterId } });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        const report = await models_1.UnderwritingReportModel.create({
            userId: reporterId,
            customerId,
            title,
            content
        });
        res.status(201).json(report);
    }
    catch (error) {
        console.error('Error creating underwriting report:', error);
        res.status(500).json({ error: 'Failed to create underwriting report' });
    }
};
exports.createUnderwritingReport = createUnderwritingReport;
//# sourceMappingURL=underwritingController.js.map