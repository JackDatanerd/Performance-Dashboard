import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Clock, Award, AlertTriangle, Upload } from 'lucide-react';

const PerformanceDashboard = () => {
  const [rawData, setRawData] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [activeTab, setActiveTab] = useState('overview');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, idx) => {
        if (header === 'Hours') row[header] = parseFloat(values[idx]) || 0;
        else if (header === 'Score') row[header] = parseInt(values[idx]) || 0;
        else row[header] = values[idx] || '';
      });
      return row;
    });

    setRawData(data);
  };

  const filteredData = useMemo(() => {
    if (rawData.length === 0) return [];
    return rawData.filter(row => {
      const empMatch = selectedEmployee === 'All' || row.Employee === selectedEmployee;
      const deptMatch = selectedDepartment === 'All' || row.Department === selectedDepartment;
      const statusMatch = selectedStatus === 'All' || row.Status === selectedStatus;
      return empMatch && deptMatch && statusMatch;
    });
  }, [rawData, selectedEmployee, selectedDepartment, selectedStatus]);

  const kpis = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        avgScore: '0.0',
        totalHours: '0.0',
        totalTasks: 0,
        bestPerformer: { name: 'N/A', score: 0 },
        worstPerformer: { name: 'N/A', score: 0 },
        atRiskCount: 0,
        trendIndicator: 'No Data'
      };
    }

    const avgScore = filteredData.reduce((sum, row) => sum + row.Score, 0) / filteredData.length;
    const totalHours = filteredData.reduce((sum, row) => sum + row.Hours, 0);
    const totalTasks = filteredData.length;
    
    const employeeAvgs = {};
    filteredData.forEach(row => {
      if (!employeeAvgs[row.Employee]) {
        employeeAvgs[row.Employee] = { sum: 0, count: 0 };
      }
      employeeAvgs[row.Employee].sum += row.Score;
      employeeAvgs[row.Employee].count += 1;
    });
    
    let bestPerformer = { name: 'N/A', score: 0 };
    let worstPerformer = { name: 'N/A', score: 100 };
    
    Object.keys(employeeAvgs).forEach(emp => {
      const avg = employeeAvgs[emp].sum / employeeAvgs[emp].count;
      if (avg > bestPerformer.score) {
        bestPerformer = { name: emp, score: avg };
      }
      if (avg < worstPerformer.score) {
        worstPerformer = { name: emp, score: avg };
      }
    });

    const atRiskCount = filteredData.filter(r => r.Status === 'Needs Improvement').length;

    return {
      avgScore: avgScore.toFixed(1),
      totalHours: totalHours.toFixed(1),
      totalTasks,
      bestPerformer,
      worstPerformer,
      atRiskCount,
      trendIndicator: '📈 Improved'
    };
  }, [filteredData]);

  const statusData = useMemo(() => {
    const counts = {};
    filteredData.forEach(row => {
      counts[row.Status] = (counts[row.Status] || 0) + 1;
    });
    return Object.keys(counts).map(status => ({
      name: status,
      value: counts[status],
      percentage: ((counts[status] / filteredData.length) * 100).toFixed(2)
    }));
  }, [filteredData]);

  const employeePerformanceData = useMemo(() => {
    const empData = {};
    filteredData.forEach(row => {
      if (!empData[row.Employee]) {
        empData[row.Employee] = { scores: [], hours: 0, tasks: 0, dept: row.Department };
      }
      empData[row.Employee].scores.push(row.Score);
      empData[row.Employee].hours += row.Hours;
      empData[row.Employee].tasks += 1;
    });
    
    return Object.keys(empData).map(emp => ({
      name: emp,
      department: empData[emp].dept,
      avgScore: parseFloat((empData[emp].scores.reduce((a, b) => a + b, 0) / empData[emp].scores.length).toFixed(1)),
      totalHours: parseFloat(empData[emp].hours.toFixed(1)),
      totalTasks: empData[emp].tasks
    })).sort((a, b) => b.avgScore - a.avgScore);
  }, [filteredData]);

  const departmentData = useMemo(() => {
    const deptData = {};
    filteredData.forEach(row => {
      if (!deptData[row.Department]) {
        deptData[row.Department] = { scores: [], hours: 0 };
      }
      deptData[row.Department].scores.push(row.Score);
      deptData[row.Department].hours += row.Hours;
    });
    
    return Object.keys(deptData).map(dept => ({
      name: dept,
      avgScore: parseFloat((deptData[dept].scores.reduce((a, b) => a + b, 0) / deptData[dept].scores.length).toFixed(1)),
      totalHours: parseFloat(deptData[dept].hours.toFixed(1))
    })).sort((a, b) => b.avgScore - a.avgScore);
  }, [filteredData]);

  const monthlyTrendData = useMemo(() => {
    const monthData = {};
    filteredData.forEach(row => {
      const date = new Date(row.Date);
      const monthKey = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
      if (!monthData[monthKey]) {
        monthData[monthKey] = { scores: [], hours: 0 };
      }
      monthData[monthKey].scores.push(row.Score);
      monthData[monthKey].hours += row.Hours;
    });
    
    return Object.keys(monthData).map(month => ({
      month,
      avgScore: parseFloat((monthData[month].scores.reduce((a, b) => a + b, 0) / monthData[month].scores.length).toFixed(1)),
      totalHours: parseFloat(monthData[month].hours.toFixed(1))
    }));
  }, [filteredData]);

  const scatterData = useMemo(() => {
    return employeePerformanceData.map(emp => ({
      name: emp.name,
      hours: emp.totalHours,
      score: emp.avgScore
    }));
  }, [employeePerformanceData]);

  const selectedEmployeeData = useMemo(() => {
    if (selectedEmployee === 'All') return null;
    return filteredData.filter(r => r.Employee === selectedEmployee).sort((a, b) => new Date(a.Date) - new Date(b.Date));
  }, [filteredData, selectedEmployee]);

  const selectedEmployeeMonthlyTrend = useMemo(() => {
    if (!selectedEmployeeData) return [];
    const monthData = {};
    selectedEmployeeData.forEach(row => {
      const date = new Date(row.Date);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      if (!monthData[monthKey]) {
        monthData[monthKey] = { scores: [] };
      }
      monthData[monthKey].scores.push(row.Score);
    });
    
    return Object.keys(monthData).map(month => ({
      month,
      avgScore: parseFloat((monthData[month].scores.reduce((a, b) => a + b, 0) / monthData[month].scores.length).toFixed(1))
    }));
  }, [selectedEmployeeData]);

  const employees = useMemo(() => ['All', ...new Set(rawData.map(r => r.Employee))], [rawData]);
  const departments = useMemo(() => ['All', ...new Set(rawData.map(r => r.Department))], [rawData]);
  const statuses = useMemo(() => ['All', ...new Set(rawData.map(r => r.Status))], [rawData]);

  const COLORS = {
    'Exceeding': '#4CAF50',
    'On Track': '#2196F3',
    'Needs Improvement': '#F44336'
  };

  const KPICard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600 text-sm font-medium">{title}</span>
        {Icon && <Icon className={`w-5 h-5 ${color}`} />}
      </div>
      <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
      {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
    </div>
  );

  if (rawData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full">
          <div className="text-center">
            <Upload className="w-20 h-20 mx-auto mb-6 text-blue-500" />
            <h1 className="text-4xl font-bold text-gray-800 mb-4">📊 Performance Dashboard</h1>
            <p className="text-gray-600 mb-8 text-lg">Upload your CSV file to get started</p>
            
            <label className="cursor-pointer">
              <div className="border-4 border-dashed border-blue-300 rounded-xl p-12 hover:border-blue-500 hover:bg-blue-50 transition-all">
                <Upload className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                <p className="text-lg font-semibold text-gray-700 mb-2">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500">CSV files only</p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="mt-8 text-left bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Required CSV Format:</h3>
              <code className="text-sm text-gray-600 block">
                Date, Employee, Department, Task, Hours, Score, Status, Notes
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">📊 Performance Overview Dashboard</h1>
            <p className="text-blue-100">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <button
            onClick={() => {
              setRawData([]);
              setSelectedEmployee('All');
              setSelectedDepartment('All');
              setSelectedStatus('All');
            }}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload New File
          </button>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {['overview', 'employee', 'department', 'trends'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 font-semibold text-sm uppercase tracking-wide border-b-2 transition-all ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'employee' && 'Employee Deep Dive'}
                {tab === 'department' && 'Department Analysis'}
                {tab === 'trends' && 'Trends & Insights'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
              <select 
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {employees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select 
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statuses.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <KPICard 
                title="Average Score" 
                value={kpis.avgScore}
                icon={Award}
                color="text-blue-500"
              />
              <KPICard 
                title="Top Performer" 
                value={kpis.bestPerformer.name}
                subtitle={`Score: ${kpis.bestPerformer.score.toFixed(1)}`}
                icon={Users}
                color="text-green-500"
              />
              <KPICard 
                title="Needs Support" 
                value={kpis.worstPerformer.name}
                subtitle={`Score: ${kpis.worstPerformer.score.toFixed(1)}`}
                icon={AlertTriangle}
                color="text-red-500"
              />
              <KPICard 
                title="Total Hours" 
                value={kpis.totalHours}
                subtitle={`${kpis.totalTasks} Tasks`}
                icon={Clock}
                color="text-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Performance Trend Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="avgScore" stroke="#2196F3" strokeWidth={2} name="Average Score" />
                    <Line yAxisId="right" type="monotone" dataKey="totalHours" stroke="#FF6F00" strokeWidth={2} name="Total Hours" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#999'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Employee Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Average Score</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Total Hours</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Total Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeePerformanceData.map((emp, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{emp.name}</td>
                        <td className="py-3 px-4">{emp.department}</td>
                        <td className="text-center py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            emp.avgScore >= 90 ? 'bg-green-100 text-green-800' :
                            emp.avgScore >= 80 ? 'bg-blue-100 text-blue-800' :
                            emp.avgScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {emp.avgScore}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">{emp.totalHours}</td>
                        <td className="text-center py-3 px-4">{emp.totalTasks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'employee' && (
          <>
            {selectedEmployee === 'All' ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Select an Employee</h3>
                <p className="text-gray-600">Use the filter above to view detailed employee performance</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <KPICard 
                    title="Employee Avg Score" 
                    value={employeePerformanceData.find(e => e.name === selectedEmployee)?.avgScore || 'N/A'}
                    color="text-blue-500"
                  />
                  <KPICard 
                    title="Total Tasks" 
                    value={employeePerformanceData.find(e => e.name === selectedEmployee)?.totalTasks || 0}
                    color="text-green-500"
                  />
                  <KPICard 
                    title="Total Hours" 
                    value={employeePerformanceData.find(e => e.name === selectedEmployee)?.totalHours || 0}
                    color="text-purple-500"
                  />
                  <KPICard 
                    title="Status" 
                    value={selectedEmployeeData?.[selectedEmployeeData.length - 1]?.Status || 'N/A'}
                    color="text-orange-500"
                  />
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Score Over Time</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={selectedEmployeeMonthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[60, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="avgScore" stroke="#2196F3" strokeWidth={3} dot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'department' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Average Score by Department</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill="#4CAF50" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Total Hours by Department</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="totalHours" fill="#FF6F00" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Monthly Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgScore" stroke="#2196F3" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Hours vs Score Correlation</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hours" name="Total Hours" />
                  <YAxis dataKey="score" name="Avg Score" domain={[70, 100]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={scatterData} fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;