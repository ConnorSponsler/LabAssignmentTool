import React, { useState, useRef } from 'react';
import { Upload, Download, Users, X } from 'lucide-react';

export default function StudentGrouper() {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('all');
  const [groups, setGroups] = useState(Array(8).fill(null).map(() => []));
  const [draggedStudent, setDraggedStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [originalHeaders, setOriginalHeaders] = useState([]);
  const fileInputRef = useRef(null);

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').filter(row => row.trim());
      
      // Store original headers
      const headers = parseCSVLine(rows[0]);
      setOriginalHeaders(headers);
      
      const parsedStudents = rows.slice(1).map((row, index) => {
        const fields = parseCSVLine(row);
        const name = fields[0]; // Name in column 1
        const column5Value = fields[4]; // Full value from column 5
        
        // Extract 3 characters after "DIS" from column 5
        let section = '';
        if (column5Value) {
          const disIndex = column5Value.indexOf('DIS');
          if (disIndex !== -1 && disIndex + 6 <= column5Value.length) {
            section = column5Value.substring(disIndex + 3, disIndex + 6);
          }
        }
        
        return { 
          id: index, 
          name, 
          section,
          originalRow: fields // Store all original fields
        };
      }).filter(s => s.name && s.section);

      setStudents(parsedStudents);
      const uniqueSections = [...new Set(parsedStudents.map(s => s.section))];
      // Sort sections numerically
      uniqueSections.sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        return numA - numB;
      });
      setSections(uniqueSections);
      setGroups(Array(8).fill(null).map(() => []));
    };
    reader.readAsText(file);
  };

  const handleDragStart = (student, fromGroup) => {
    setDraggedStudent({ student, fromGroup });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (groupIndex) => {
    if (!draggedStudent) return;

    const { student, fromGroup } = draggedStudent;
    const newGroups = [...groups];

    if (fromGroup !== null) {
      newGroups[fromGroup] = newGroups[fromGroup].filter(s => s.id !== student.id);
    }

    newGroups[groupIndex] = [...newGroups[groupIndex], student];
    setGroups(newGroups);
    setDraggedStudent(null);
  };

  const handleStudentClick = (student, fromGroup) => {
    setSelectedStudent({ student, fromGroup });
  };

  const handleGroupClick = (groupIndex) => {
    if (!selectedStudent) return;

    const { student, fromGroup } = selectedStudent;
    const newGroups = [...groups];

    if (fromGroup !== null) {
      newGroups[fromGroup] = newGroups[fromGroup].filter(s => s.id !== student.id);
    }

    newGroups[groupIndex] = [...newGroups[groupIndex], student];
    setGroups(newGroups);
    setSelectedStudent(null);
  };

  const removeFromGroup = (groupIndex, studentId) => {
    const newGroups = [...groups];
    newGroups[groupIndex] = newGroups[groupIndex].filter(s => s.id !== studentId);
    setGroups(newGroups);
  };

  const getUnassignedStudents = () => {
    const assignedIds = new Set(groups.flat().map(s => s.id));
    return students.filter(s => 
      !assignedIds.has(s.id) && 
      (selectedSection === 'all' || s.section === selectedSection)
    );
  };

  const downloadCSV = () => {
    // Create header row with original headers plus group_name in 6th position
    const headerRow = [...originalHeaders];
    // Ensure we have at least 5 columns, then add group_name as 6th
    while (headerRow.length < 5) {
      headerRow.push('');
    }
    headerRow[5] = 'group_name';
    
    let csvContent = headerRow.map(h => h.includes(',') ? `"${h}"` : h).join(',') + '\n';
    
    // Only output students that have been assigned to groups
    groups.forEach((group, index) => {
      group.forEach(student => {
        const row = [...student.originalRow];
        // Ensure we have at least 5 columns
        while (row.length < 5) {
          row.push('');
        }
        // Add assignment in 6th column
        row[5] = `Section ${student.section} - Table ${index + 1}`;
        
        // Format each field (add quotes if contains comma)
        const formattedRow = row.map(field => 
          field && field.includes(',') ? `"${field}"` : field
        ).join(',');
        
        csvContent += formattedRow + '\n';
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'group_assignments.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const unassignedStudents = getUnassignedStudents();
  const totalAssigned = groups.reduce((sum, g) => sum + g.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="text-indigo-600" />
            Student Group Assignment
          </h1>
          
          <div className="flex flex-wrap gap-4 items-center mb-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition"
            >
              <Upload size={20} />
              Upload CSV
            </button>

            {sections.length > 0 && (
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="all">All Sections</option>
                {sections.map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            )}

            {totalAssigned > 0 && (
              <button
                onClick={downloadCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition ml-auto"
              >
                <Download size={20} />
                Download CSV
              </button>
            )}
          </div>

          <div className="text-sm text-gray-600">
            <p>Upload the Course Roster CSV</p>
            <p className="mt-1">Assigned: {totalAssigned} | Unassigned: {unassignedStudents.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Available Students ({unassignedStudents.length})
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {unassignedStudents.map(student => (
                  <div
                    key={student.id}
                    draggable
                    onDragStart={() => handleDragStart(student, null)}
                    onClick={() => handleStudentClick(student, null)}
                    className={`bg-blue-50 border-2 rounded p-3 cursor-pointer hover:bg-blue-100 transition ${
                      selectedStudent?.student.id === student.id ? 'border-blue-500 bg-blue-100' : 'border-blue-200'
                    }`}
                  >
                    <div className="font-medium text-gray-800">{student.name}</div>
                    <div className="text-sm text-gray-600">Section {student.section}</div>
                  </div>
                ))}
                {unassignedStudents.length === 0 && (
                  <div className="text-gray-400 text-center py-8">
                    {students.length === 0 ? 'Upload a CSV to begin' : 'All students assigned'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {groups.map((group, index) => (
                <div
                  key={index}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  onClick={() => handleGroupClick(index)}
                  className={`bg-white rounded-lg shadow-lg p-4 min-h-48 cursor-pointer transition ${
                    selectedStudent ? 'hover:ring-2 hover:ring-indigo-400' : ''
                  }`}
                >
                  <h3 className="font-semibold text-gray-700 mb-3 text-center">
                    Table {index + 1}
                    <span className="ml-2 text-sm text-gray-500">({group.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {group.map(student => (
                      <div
                        key={student.id}
                        draggable
                        onDragStart={() => handleDragStart(student, index)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStudentClick(student, index);
                        }}
                        className={`bg-indigo-50 border-2 rounded p-2 cursor-pointer hover:bg-indigo-100 transition group relative ${
                          selectedStudent?.student.id === student.id ? 'border-indigo-500 bg-indigo-100' : 'border-indigo-200'
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromGroup(index, student.id);
                          }}
                          className="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={14} />
                        </button>
                        <div className="text-sm font-medium text-gray-800 pr-4">{student.name}</div>
                        <div className="text-xs text-gray-600">Sec {student.section}</div>
                      </div>
                    ))}
                    {group.length === 0 && (
                      <div className="text-gray-300 text-sm text-center py-4 border-2 border-dashed border-gray-200 rounded">
                        {selectedStudent ? 'Click to assign here' : 'Drop here'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
