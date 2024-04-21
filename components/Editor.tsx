"use client";
import React, { useState, useEffect } from "react";
import styles from "./Editor.module.scss";
import commonLanguages from "../languages.json";
import TextOutput from './TextOutput';

import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox" // Import Checkbox from @shadcn/ui
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Loader2 } from "lucide-react"

function Editor() {
    const [text, setText] = useState("She dont likes go too the store on sundays;"); // Initial text input by the user
    const [language, setLanguage] = useState<Language>(commonLanguages[2]); // Selected language, default is English
    const [promptStyle, setPromptStyle] = useState("no-style"); // Style of the prompt
    const [isGenderNeutral, setIsGenderNeutral] = useState<boolean>(false); // State to manage gender-neutral option
    const [textLength, setTextLength] = useState(0);

    const [optimizedText, setOptimizedText] = useState<string>(""); // Stores text changes after optimization
    const [debouncedText, setDebouncedText] = useState(text); // Debounced text for delayed processing
    const [activeChangeId, setActiveChangeId] = useState<number | null>(null);
    const [isLoadingOptimization, setIsLoadingOptimization] = useState(false);
    const [isLoadingLanguage, setIsLoadingLanguage] = useState(false);

    const adaptLanguage: Boolean = true; // Debug flag to adapt language automatically

    // Language adaptation based on text change, every 3 seconds
    useEffect(() => {
        if (adaptLanguage && text.trim() !== "") {
            const handler = setTimeout(async () => {
                if (text !== debouncedText && language.code !== "de-ch") {
                    setIsLoadingLanguage(true);
                    // Fetching language prediction from the server
                    const response = await fetch('/api/language', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ text }),
                    });
                    const data = await response.json();
                    console.log("language prediction:", data);
                    setLanguage(data);
                    setIsLoadingLanguage(false);
                    setDebouncedText(text);
                }
            }, 3000);
    
            return () => {
                clearTimeout(handler);
            };
        } else {
            setDebouncedText("");
        }
    }, [text, debouncedText]);

    
    // Handler for form submission
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoadingOptimization(true);
        // Fetching optimized text from the server
        const response = await fetch('/api/optimize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, language, promptStyle, isGenderNeutral, textLength }),
        });
        let changes = await response.json();

        // Fetching text length optimization if text length is not 0
        if (textLength !== 0) {
            const response = await fetch('/api/textlength', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: changes.optimizedText, textLength, characterCount: changes.optimizedText.length }),
            });
            changes = await response.json();
        }

        setOptimizedText(changes.optimizedText);
        setIsLoadingOptimization(false);
    };

    // Accept all changes handler
    const handleAcceptAll = () => {
        if (optimizedText !== "") {
            setText(optimizedText); // Update text with optimizedText
            setOptimizedText("");
        }
    };

    // Reject all changes handler
    const handleRejectAll = () => {
        setOptimizedText(""); // Keep the original text, discard changes
    };

    return (
        <div className="container mx-auto px-4 max-w-[1000px]">

            {/* Control parameters to adjust the prompt style and language */}
            <div className="w-full flex flex-col  border-b border-gray-200 pb-4">
                <div className="flex flex-row items-center justify-between pb-4">
                    <div>
                        <Button className={`hover:bg-blue-500 mr-2 ${promptStyle === "no-style" ? "bg-blue-500 text-white" : ""}`} onClick={() => setPromptStyle("no-style")} variant="secondary">No Style</Button>
                        <Button className={`hover:bg-blue-500 mr-2 ${promptStyle === "formal" ? "bg-blue-500 text-white" : ""}`} onClick={() => setPromptStyle("formal")} variant="secondary">Formal 🧐</Button>
                        <Button className={`hover:bg-blue-500 ${promptStyle === "informal" ? "bg-blue-500 text-white" : ""}`} onClick={() => setPromptStyle("informal")} variant="secondary">Informal 😎</Button>
                    </div>
                    <div className="flex flex-row items-center justify-between gap-2">
                        {isLoadingLanguage ? <Loader2 className="h-4 w-4 animate-spin" /> : ""}
                        <Select  value={language.code} onValueChange={(value) => setLanguage(commonLanguages.find((lang) => lang.code === value) as Language)}>
                            <SelectTrigger className="w-[250px]">{language.name}</SelectTrigger>
                            <SelectContent>
                                {commonLanguages.map(lang => (
                                    <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem> // Mapping language options to SelectItem
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                            <Checkbox 
                                id="swiss-german"
                                checked={language.code === "de-ch"} 
                                onCheckedChange={(checked) => setLanguage(commonLanguages.find((lang) => lang.code === (checked ? "de-ch" : "de")) as Language)}
                                disabled={language.code !== "de" && language.code !== "de-ch"}
                            />
                            <label htmlFor="swiss-german" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Swiss German
                            </label>
                        </div>
                    </div>
                </div>
                <div>
                    <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                            <Checkbox 
                                id="gender-neutral"
                                checked={isGenderNeutral} 
                                onCheckedChange={(checked) => setIsGenderNeutral(checked as boolean)}
                            />
                            <label htmlFor="gender-neutral" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mr-2">
                                Gender Neutral
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="text-length-slider" className="text-sm font-medium leading-none">
                                shorter {`<->`} longer ({textLength}%)
                            </label>
                            <Slider 
                                    id="text-length-slider"
                                    className="w-[180px]" 
                                    defaultValue={[0]} 
                                    min={-100} 
                                    max={100} 
                                    step={10} 
                                    onValueChange={(value) => setTextLength(value[0])} // Update textLength state based on slider value
                                />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main user interaction to enter text, submit and integrate suggestions */}
            <div className="w-full pt-4">
                <div className="w-full flex flex-row gap-4"> {/* Added gap class for spacing between form and text output */}
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col relative">
                        <Textarea className="mb-4 h-[300px]" value={text} onChange={(e) => setText(e.target.value)}></Textarea>
                        <span className="absolute bottom-2 right-2 text-sm text-gray-500">{text.length} characters</span>
                        <Button className="w-[100px]" disabled={isLoadingOptimization}>{isLoadingOptimization ? <Loader2 className="h-4 w-4 animate-spin" /> : "Optimize"}</Button>
                    </form>
                    
                    {/* Displaying highlighted changes */}
                    <div className="flex-1 relative">
                        <TextOutput
                          text={text} 
                          setText={setText}
                          language={language}
                          optimizedText={optimizedText} 
                          setOptimizedText={setOptimizedText}
                          activeChangeId={activeChangeId} 
                          setActiveChangeId={setActiveChangeId} 
                        />
                        <span className="absolute bottom-2 right-2 text-sm text-gray-500">{optimizedText.length} characters</span>
                        <Button className="w-[100px]" onClick={handleAcceptAll}>Accept All</Button> {/* Accept all changes */}
                        <Button className="w-[100px]" onClick={handleRejectAll}>Reject All</Button> {/* Reject all changes */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Editor;
