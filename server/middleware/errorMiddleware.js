// server/middleware/errorMiddleware.js

const errorHandler = (err, req, res, next) => {
    // 1. Log the full error internally (So YOU can see what happened)
    console.error('🔥 CRITICAL ERROR:', err);

    // 2. Handle Oracle Database Errors (ORA-xxxxx)
    if (err.message && err.message.includes('ORA-')) {
        
        // ORA-00001: Unique Constraint Violated (e.g. Duplicate Email)
        if (err.message.includes('ORA-00001')) {
            return res.status(409).json({ 
                error: 'Duplicate Record', 
                message: 'This record already exists (e.g. Email or Phone number is already taken).' 
            });
        }

        // ORA-02291: Parent Key Not Found (e.g. Creating a listing for a user that doesn't exist)
        if (err.message.includes('ORA-02291')) {
            return res.status(400).json({ 
                error: 'Invalid Reference', 
                message: 'Operation failed because a related record was not found.' 
            });
        }

        // ORA-02292: Child Record Found (e.g. Deleting a User who has Listings)
        if (err.message.includes('ORA-02292')) {
            return res.status(409).json({ 
                error: 'Action Denied', 
                message: 'Cannot delete this item because it is being used elsewhere in the system.' 
            });
        }

        // ORA-02290: Check Constraint Violated (e.g. Bad Phone Number format)
        if (err.message.includes('ORA-02290')) {
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: 'Data does not meet requirements (e.g. Invalid phone number format).' 
            });
        }

        // ORA-12899: Value Too Large
        if (err.message.includes('ORA-12899')) {
            return res.status(400).json({ 
                error: 'Input Too Long', 
                message: 'One of the fields you entered is too long.' 
            });
        }

        // Default Oracle Fallback
        return res.status(500).json({ 
            error: 'Database Error', 
            message: 'A database operation failed. Please try again later.' 
        });
    }

    // 3. Handle File Upload Errors (Multer)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
            error: 'File Too Large', 
            message: 'Uploaded file must be smaller than 10MB.' 
        });
    }

    // 4. Default / Catch-All Error
    // Hide stack trace in production
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        error: 'Server Error',
        message: 'Something went wrong on our end. We are looking into it.'
    });
};

const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = { errorHandler, notFound };