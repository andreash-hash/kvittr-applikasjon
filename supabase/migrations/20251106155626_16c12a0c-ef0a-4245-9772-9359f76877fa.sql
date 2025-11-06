-- Add processing_status column to receipts table
ALTER TABLE receipts 
ADD COLUMN processing_status text DEFAULT 'pending';

-- Add index for faster queries on processing_status
CREATE INDEX idx_receipts_processing_status ON receipts(processing_status);

-- Enable realtime for receipts table
ALTER TABLE receipts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE receipts;