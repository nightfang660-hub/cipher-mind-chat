-- Add search_results column to messages table to store images and web results
ALTER TABLE public.messages 
ADD COLUMN search_results JSONB DEFAULT NULL;

-- Add index for better performance when querying messages with search results
CREATE INDEX idx_messages_search_results ON public.messages USING GIN(search_results);

-- Add comment to explain the column
COMMENT ON COLUMN public.messages.search_results IS 'Stores search results including images and web links as JSON';