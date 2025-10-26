// components/GeminiImageAnalyzer.tsx
import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import Button from './Button';
import Textarea from './Textarea';
import { ImageUp, LoaderCircle, AlertTriangle, FileInput } from 'lucide-react';
import { ParsedScheduleShift } from '../types';
import { normName, to24h, uuid } from '../utils/helpers';
import { SHORT_WEEKDAY_NAMES } from '../constants';

// Helper function to convert a file blob to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
    });
};

// Simple text parsing logic to extract shifts from OCR text
const parseTextToShifts = (text: string): ParsedScheduleShift[] => {
    const shifts: ParsedScheduleShift[] = [];
    const lines = text.split('\n').filter(line => line.trim() !== '');
    let currentMemberName = '';

    const timeRegex = /(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)\s*[-–—]\s*(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)/gi;
    
    for (const line of lines) {
        // A simple heuristic: if a line contains letters but no time pattern, it's likely a name.
        if (!line.match(timeRegex) && /[a-zA-Z]/.test(line) && !/schedule|week of/i.test(line)) {
            const potentialName = normName(line.split(/(\s{2,})/)[0]); // Split by multiple spaces to avoid grabbing other text
             if (potentialName.length > 2) {
                currentMemberName = potentialName;
             }
        }
        
        if (currentMemberName) {
            let match;
            timeRegex.lastIndex = 0; // Reset regex index for each line
            while ((match = timeRegex.exec(line)) !== null) {
                const start = to24h(match[1]);
                const end = to24h(match[2]);

                // Look for a day abbreviation in the vicinity of the time match
                const context = line.substring(0, match.index);
                const dayMatch = context.match(new RegExp(`(${SHORT_WEEKDAY_NAMES.join('|')})`, 'gi'));

                if (dayMatch) {
                    const day = dayMatch[dayMatch.length-1].charAt(0).toUpperCase() + dayMatch[dayMatch.length-1].slice(1).toLowerCase() as ParsedScheduleShift['day'];
                    shifts.push({
                        id: uuid(),
                        memberName: currentMemberName,
                        day: day,
                        start,
                        end,
                        confidence: 0.8, // Lower confidence as it's parsed from raw text
                        rawText: line,
                    });
                }
            }
        }
    }
    return shifts;
};


interface GeminiImageAnalyzerProps {
  onScheduleParsed: (shifts: ParsedScheduleShift[]) => void;
}

const GeminiImageAnalyzer: React.FC<GeminiImageAnalyzerProps> = ({ onScheduleParsed }) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>("Perform OCR on this weekly work schedule. Extract the text, focusing on employee names, days of the week, and shift start/end times. Present the data clearly as plain text.");
    const [result, setResult] = useState<string>('');
    const [parsedShifts, setParsedShifts] = useState<ParsedScheduleShift[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
            setResult('');
            setError(null);
            setParsedShifts(null);
        }
    };

    const handleAnalyzeClick = useCallback(async () => {
        if (!imageFile) {
            setError("Please upload an image first.");
            return;
        }
        if (!prompt.trim()) {
            setError("Please enter a prompt.");
            return;
        }

        setLoading(true);
        setError(null);
        setResult('');
        setParsedShifts(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64Data = await fileToBase64(imageFile);

            const imagePart = { inlineData: { mimeType: imageFile.type, data: base64Data } };
            const textPart = { text: prompt };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, textPart] },
            });
            
            const ocrText = response.text;
            setResult(ocrText);

            // Automatically attempt to parse the result
            const shifts = parseTextToShifts(ocrText);
            if (shifts.length > 0) {
                setParsedShifts(shifts);
            } else {
                setError("OCR was successful, but no valid shifts could be automatically parsed. You can copy the text and use the manual editor.");
            }

        } catch (err) {
            console.error("Error analyzing image:", err);
            setError(`Failed to analyze the image. Please try again. Error: ${(err as Error).message}`);
        } finally {
            setLoading(false);
        }
    }, [imageFile, prompt]);

    const handleImportClick = () => {
        if (parsedShifts) {
            onScheduleParsed(parsedShifts);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-textdark">Schedule Import via Image OCR</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Image Upload & Preview */}
                <div className="bg-card shadow-lg rounded-lg p-6 flex flex-col items-center justify-center">
                    {imageUrl ? (
                        <img src={imageUrl} alt="Upload preview" className="max-w-full max-h-96 rounded-md object-contain" />
                    ) : (
                        <div className="text-center text-gray-500">
                            <ImageUp size={64} className="mx-auto mb-4" />
                            <p>Upload a schedule image to get started.</p>
                        </div>
                    )}
                    <div className="mt-4 w-full">
                        <label htmlFor="image-upload" className="block text-sm font-medium text-textdark mb-1">
                            Choose an image file
                        </label>
                        <input
                            id="image-upload"
                            type="file"
                            accept="image/png, image/jpeg"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-blue-700"
                        />
                    </div>
                </div>

                {/* Right Column: Prompt & Results */}
                <div className="bg-card shadow-lg rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-textdark mb-4">1. Analyze Image</h3>
                    <Textarea
                        id="prompt"
                        label="Your Prompt to Gemini"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                        placeholder="e.g., What's in this image? Describe the scene."
                    />
                    <Button onClick={handleAnalyzeClick} disabled={!imageFile || loading} className="w-full mt-2">
                        {loading ? <><LoaderCircle size={18} className="animate-spin mr-2" /> Analyzing...</> : 'Analyze Image with Gemini'}
                    </Button>

                    <div className="mt-6">
                        <h4 className="text-lg font-semibold text-textdark mb-2">2. Review & Import</h4>
                        {loading && <div className="flex items-center text-gray-500"><LoaderCircle size={24} className="animate-spin mr-3" /><p>Gemini is analyzing the image...</p></div>}
                        {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><div className="flex items-center"><AlertTriangle size={20} className="mr-3" /><div><p className="font-bold">Error</p><p>{error}</p></div></div></div>}
                        
                        {result && (
                            <div className="space-y-4">
                                <div>
                                    <h5 className="font-semibold text-sm mb-1">Raw Text from Gemini:</h5>
                                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                                        {result}
                                    </div>
                                </div>
                                {parsedShifts && (
                                    <div>
                                        <h5 className="font-semibold text-sm mb-1">Parsed Shifts ({parsedShifts.length} found):</h5>
                                        <div className="bg-green-50 p-4 rounded-md border border-green-200 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                                            {parsedShifts.map(s => `${s.memberName}: ${s.day} ${s.start}-${s.end}`).join('\n')}
                                        </div>
                                        <Button onClick={handleImportClick} className="w-full mt-4" variant="primary">
                                            <FileInput size={18} className="mr-2"/> Review & Import Schedule
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeminiImageAnalyzer;