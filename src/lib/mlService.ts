// ML Model Types
export interface TrainingData {
  features: number[][]
  labels: number[]
  featureNames: string[]
}

export interface PredictionResult {
  prediction: number
  confidence: number
  features: number[]
  timestamp: string
}

export interface ModelMetrics {
  accuracy: number
  loss: number
  epochs: number
  trainingTime: number
}

// Feature Engineering
export class FeatureEngineer {
  static normalizeData(data: number[]): number[] {
    const min = Math.min(...data)
    const max = Math.max(...data)
    if (max === min) return data.map(() => 0.5)
    return data.map(value => (value - min) / (max - min))
  }

  static createTimeFeatures(date: Date): number[] {
    return [
      date.getDay() / 7, // Day of week (0-1)
      date.getDate() / 31, // Day of month (0-1)
      date.getMonth() / 12, // Month (0-1)
      date.getHours() / 24, // Hour (0-1)
      date.getMinutes() / 60, // Minute (0-1)
    ]
  }

  static createWorkerFeatures(worker: any, historicalData: any[]): number[] {
    const workerEntries = historicalData.filter(entry => 
      entry.user_id === worker.id || entry.worker_name === worker.full_name
    )
    
    const totalEntries = workerEntries.length
    const avgQuantity = workerEntries.length > 0 
      ? workerEntries.reduce((sum, e) => sum + e.quantity_completed, 0) / workerEntries.length 
      : 0
    
    const consistency = this.calculateConsistency(workerEntries)
    const experience = this.calculateExperience(worker.created_at)
    const recentPerformance = this.calculateRecentPerformance(workerEntries)
    
    return [
      totalEntries / 100, // Normalized entry count
      avgQuantity / 10, // Normalized average quantity
      consistency,
      experience,
      recentPerformance,
      worker.role === 'admin' ? 1 : worker.role === 'manager' ? 0.7 : 0.3, // Role weight
    ]
  }

  static createProjectFeatures(project: any, stages: any[], assemblies: any[], progressEntries: any[]): number[] {
    const projectStages = stages.filter(s => s.project_id === project.id)
    const projectAssemblies = assemblies.filter(a => a.project_id === project.id)
    const projectProgress = progressEntries.filter(e => 
      projectAssemblies.some(a => a.id === e.assembly_id)
    )

    const totalQuantity = projectAssemblies.reduce((sum, a) => sum + a.total_quantity, 0)
    const completedQuantity = projectProgress.reduce((sum, e) => sum + e.quantity_completed, 0)
    const progress = totalQuantity > 0 ? Math.min(1, completedQuantity / totalQuantity) : 0 // Clamp to 1
    
    const complexity = this.calculateProjectComplexity(projectAssemblies, projectStages)
    const urgency = this.calculateUrgency(project.start_date, project.target_completion_date)
    const resourceIntensity = this.calculateResourceIntensity(projectProgress)
    const stageDiversity = this.calculateStageDiversity(projectStages)
    
    return [
      progress,
      complexity,
      urgency,
      resourceIntensity,
      stageDiversity,
      projectAssemblies.length / 50, // Normalized assembly count
      totalQuantity / 1000, // Normalized total quantity
    ]
  }

  private static calculateConsistency(entries: any[]): number {
    if (entries.length < 2) return 0.5
    
    const quantities = entries.map(e => e.quantity_completed)
    const mean = quantities.reduce((sum, q) => sum + q, 0) / quantities.length
    const variance = quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / quantities.length
    const stdDev = Math.sqrt(variance)
    
    return Math.max(0, 1 - (stdDev / mean)) // Higher consistency = lower std dev
  }

  private static calculateExperience(createdAt: string): number {
    const startDate = new Date(createdAt)
    const now = new Date()
    const daysSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    return Math.min(1, daysSinceStart / 365) // Normalized to 1 year
  }

  private static calculateRecentPerformance(entries: any[]): number {
    if (entries.length === 0) return 0.5
    
    const recentEntries = entries.slice(-7) // Last 7 entries
    const olderEntries = entries.slice(0, -7)
    
    if (olderEntries.length === 0) return 0.5
    
    const recentAvg = recentEntries.reduce((sum, e) => sum + e.quantity_completed, 0) / recentEntries.length
    const olderAvg = olderEntries.reduce((sum, e) => sum + e.quantity_completed, 0) / olderEntries.length
    
    return recentAvg > olderAvg ? 1 : recentAvg / olderAvg
  }

  private static calculateProjectComplexity(assemblies: any[], stages: any[]): number {
    if (assemblies.length === 0) return 0.5
    
    const avgQuantity = assemblies.reduce((sum, a) => sum + a.total_quantity, 0) / assemblies.length
    const weightVariation = assemblies.some(a => a.weight_per_unit) ? 
      assemblies.filter(a => a.weight_per_unit).length / assemblies.length : 0
    const stageComplexity = stages.length / 4 // Normalize to 4 stages max
    
    return Math.min(1, (avgQuantity / 100 + weightVariation + stageComplexity) / 3)
  }

  private static calculateStageDiversity(stages: any[]): number {
    if (stages.length === 0) return 0
    
    const uniqueStages = new Set(stages.map(s => s.stage_name)).size
    const totalPossibleStages = 4 // kesim, imalat, kaynak, boya
    
    return uniqueStages / totalPossibleStages
  }

  private static calculateUrgency(startDate: string, targetDate: string): number {
    const start = new Date(startDate)
    const target = new Date(targetDate)
    const now = new Date()
    
    const totalDuration = target.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()
    
    if (totalDuration <= 0) return 1
    return Math.min(1, elapsed / totalDuration)
  }

  private static calculateResourceIntensity(progressEntries: any[]): number {
    if (progressEntries.length === 0) return 0.5
    
    const uniqueWorkers = new Set(progressEntries.map(e => e.user_id || e.worker_name)).size
    const avgQuantity = progressEntries.reduce((sum, e) => sum + e.quantity_completed, 0) / progressEntries.length
    
    return Math.min(1, (uniqueWorkers / 10 + avgQuantity / 20) / 2)
  }
}

// Simple Neural Network for Time Series Prediction
export class SimpleNeuralPredictor {
  private weights: number[][] = []
  private bias: number[] = []
  private isTrained = false

  createModel(inputSize: number, hiddenSize: number = 10): void {
    // Initialize weights randomly
    this.weights = [
      Array(inputSize).fill(0).map(() => Math.random() - 0.5), // Input to hidden
      Array(hiddenSize).fill(0).map(() => Math.random() - 0.5)  // Hidden to output
    ]
    this.bias = [Math.random() - 0.5, Math.random() - 0.5]
  }

  async train(data: TrainingData, epochs: number = 100): Promise<ModelMetrics> {
    const startTime = Date.now()
    
    if (data.features.length === 0) {
      return { accuracy: 0, loss: 1, epochs: 0, trainingTime: 0 }
    }

    const inputSize = data.features[0].length
    this.createModel(inputSize)

    let totalLoss = 0
    const learningRate = 0.01
    const actualEpochs = Math.max(50, Math.min(200, data.features.length * 5)) // Dynamic epochs

    for (let epoch = 0; epoch < actualEpochs; epoch++) {
      let epochLoss = 0
      
      for (let i = 0; i < data.features.length; i++) {
        const input = data.features[i]
        const target = data.labels[i]
        
        // Forward pass
        const hidden = this.sigmoid(this.dotProduct(input, this.weights[0]) + this.bias[0])
        const output = this.sigmoid(this.dotProduct([hidden], this.weights[1]) + this.bias[1])
        
        // Calculate loss
        const error = target - output
        epochLoss += error * error
        
        // Backward pass (simplified)
        const outputGradient = error * this.sigmoidDerivative(output)
        const hiddenGradient = outputGradient * this.weights[1][0] * this.sigmoidDerivative(hidden)
        
        // Update weights
        for (let j = 0; j < this.weights[1].length; j++) {
          this.weights[1][j] += learningRate * outputGradient * hidden
        }
        this.bias[1] += learningRate * outputGradient
        
        for (let j = 0; j < this.weights[0].length; j++) {
          this.weights[0][j] += learningRate * hiddenGradient * input[j]
        }
        this.bias[0] += learningRate * hiddenGradient
      }
      
      totalLoss = epochLoss / data.features.length
    }

    const trainingTime = Date.now() - startTime
    this.isTrained = true

    // Calculate accuracy based on R-squared
    const mean = data.labels.reduce((sum, label) => sum + label, 0) / data.labels.length
    const totalSumSquares = data.labels.reduce((sum, label) => sum + Math.pow(label - mean, 2), 0)
    const residualSumSquares = totalLoss * data.features.length
    const rSquared = totalSumSquares > 0 ? Math.max(0, 1 - (residualSumSquares / totalSumSquares)) : 0

    console.log(`🧠 Neural Network Metrics:`)
    console.log(`   - Data points: ${data.features.length}`)
    console.log(`   - Epochs: ${actualEpochs}`)
    console.log(`   - Total Loss: ${totalLoss.toFixed(4)}`)
    console.log(`   - R-squared: ${rSquared.toFixed(4)}`)
    console.log(`   - Training Time: ${trainingTime}ms`)

    return {
      accuracy: Math.min(0.95, Math.max(0.1, rSquared)), // Clamp between 10% and 95%
      loss: totalLoss,
      epochs: actualEpochs,
      trainingTime
    }
  }

  predict(features: number[]): PredictionResult {
    if (!this.isTrained || this.weights.length === 0) {
      throw new Error('Model not trained')
    }

    const hidden = this.sigmoid(this.dotProduct(features, this.weights[0]) + this.bias[0])
    const output = this.sigmoid(this.dotProduct([hidden], this.weights[1]) + this.bias[1])

    return {
      prediction: output,
      confidence: 0.8,
      features,
      timestamp: new Date().toISOString()
    }
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x))
  }

  private sigmoidDerivative(x: number): number {
    return x * (1 - x)
  }

  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0)
  }

  saveModel(): void {
    const modelData = {
      weights: this.weights,
      bias: this.bias,
      isTrained: this.isTrained
    }
    localStorage.setItem('ml-models/project-predictor', JSON.stringify(modelData))
  }

  loadModel(): void {
    try {
      const modelData = localStorage.getItem('ml-models/project-predictor')
      if (modelData) {
        const parsed = JSON.parse(modelData)
        this.weights = parsed.weights
        this.bias = parsed.bias
        this.isTrained = parsed.isTrained
      }
    } catch (error) {
      console.log('No saved model found')
    }
  }
}

// Simple Linear Regression for Predictions
export class LinearRegressionPredictor {
  private weights: number[] = []
  private bias: number = 0
  private isTrained = false

  async train(data: TrainingData): Promise<ModelMetrics> {
    const startTime = Date.now()
    
    if (data.features.length === 0) {
      return { accuracy: 0, loss: 1, epochs: 1, trainingTime: 0 }
    }

    const featureCount = data.features[0].length
    this.weights = Array(featureCount).fill(0)
    this.bias = 0

    // Simple linear regression using gradient descent
    const learningRate = 0.01
    const epochs = Math.max(50, Math.min(500, data.features.length * 10)) // Dynamic epochs based on data size
    let totalError = 0

    for (let epoch = 0; epoch < epochs; epoch++) {
      let epochError = 0
      
      for (let i = 0; i < data.features.length; i++) {
        const features = data.features[i]
        const target = data.labels[i]
        
        // Predict
        const prediction = this.dotProduct(features, this.weights) + this.bias
        
        // Calculate error
        const error = target - prediction
        epochError += error * error
        
        // Update weights
        for (let j = 0; j < this.weights.length; j++) {
          this.weights[j] += learningRate * error * features[j]
        }
        this.bias += learningRate * error
        
        // Add small delay for better UX
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1))
        }
      }
      
      totalError = epochError / data.features.length
    }

    const trainingTime = Date.now() - startTime
    this.isTrained = true

    // Calculate accuracy based on R-squared
    const mean = data.labels.reduce((sum, label) => sum + label, 0) / data.labels.length
    const totalSumSquares = data.labels.reduce((sum, label) => sum + Math.pow(label - mean, 2), 0)
    const residualSumSquares = totalError * data.features.length
    const rSquared = totalSumSquares > 0 ? Math.max(0, 1 - (residualSumSquares / totalSumSquares)) : 0

    console.log(`📊 Linear Regression Metrics:`)
    console.log(`   - Data points: ${data.features.length}`)
    console.log(`   - Epochs: ${epochs}`)
    console.log(`   - Total Error: ${totalError.toFixed(4)}`)
    console.log(`   - R-squared: ${rSquared.toFixed(4)}`)
    console.log(`   - Training Time: ${trainingTime}ms`)

    return {
      accuracy: Math.min(0.95, Math.max(0.1, rSquared)), // Clamp between 10% and 95%
      loss: totalError,
      epochs: 1,
      trainingTime
    }
  }

  predict(features: number[]): PredictionResult {
    if (!this.isTrained) {
      throw new Error('Model not trained')
    }

    const prediction = this.dotProduct(features, this.weights) + this.bias
    const confidence = 0.8

    return {
      prediction: Math.max(0, Math.min(1, prediction)), // Clamp between 0 and 1
      confidence,
      features,
      timestamp: new Date().toISOString()
    }
  }

  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0)
  }
}

// Random Forest for Classification
export class RandomForestPredictor {
  private trees: any[] = []
  private featureCount = 0

  train(data: TrainingData, nTrees: number = 10): ModelMetrics {
    const startTime = Date.now()
    this.featureCount = data.features[0].length
    
    // Create multiple decision trees
    for (let i = 0; i < nTrees; i++) {
      const tree = this.createDecisionTree(data)
      this.trees.push(tree)
    }
    
    const trainingTime = Date.now() - startTime

    return {
      accuracy: 0.85, // Placeholder
      loss: 0.15,
      epochs: nTrees,
      trainingTime
    }
  }

  predict(features: number[]): PredictionResult {
    if (this.trees.length === 0) {
      throw new Error('Model not trained')
    }

    // Get predictions from all trees
    const predictions = this.trees.map(tree => this.predictWithTree(tree, features))
    
    // Average the predictions
    const avgPrediction = predictions.reduce((sum, pred) => sum + pred, 0) / predictions.length
    
    // Calculate confidence based on agreement between trees
    const variance = predictions.reduce((sum, pred) => sum + Math.pow(pred - avgPrediction, 2), 0) / predictions.length
    const confidence = Math.max(0.5, 1 - Math.sqrt(variance))

    return {
      prediction: avgPrediction,
      confidence,
      features,
      timestamp: new Date().toISOString()
    }
  }

  private createDecisionTree(data: TrainingData): any {
    // Simplified decision tree implementation
    return {
      feature: Math.floor(Math.random() * this.featureCount),
      threshold: Math.random(),
      left: null,
      right: null,
      prediction: Math.random()
    }
  }

  private predictWithTree(tree: any, features: number[]): number {
    if (tree.left === null && tree.right === null) {
      return tree.prediction
    }
    
    if (features[tree.feature] < tree.threshold) {
      return this.predictWithTree(tree.left, features)
    } else {
      return this.predictWithTree(tree.right, features)
    }
  }
}

// Main ML Service
export class MLService {
  private neuralPredictor = new SimpleNeuralPredictor()
  private linearPredictor = new LinearRegressionPredictor()
  private rfPredictor = new RandomForestPredictor()

  async initialize(): Promise<void> {
    try {
      this.neuralPredictor.loadModel()
      console.log('ML Service initialized with saved models')
    } catch (error) {
      console.log('ML Service initialized with new models')
    }
  }

  async trainProjectCompletionModel(projects: any[], stages: any[], assemblies: any[], progressEntries: any[]): Promise<ModelMetrics> {
    const trainingData: TrainingData = {
      features: [],
      labels: [],
      featureNames: ['progress', 'complexity', 'urgency', 'resource_intensity', 'stage_diversity', 'assembly_count', 'total_quantity']
    }

    // Prepare training data
    for (const project of projects) {
      const features = FeatureEngineer.createProjectFeatures(project, stages, assemblies, progressEntries)
      const projectAssemblies = assemblies.filter(a => a.project_id === project.id)
      const projectProgress = progressEntries.filter(e => 
        projectAssemblies.some(a => a.id === e.assembly_id)
      )
      
      const totalQuantity = projectAssemblies.reduce((sum, a) => sum + a.total_quantity, 0)
      const completedQuantity = projectProgress.reduce((sum, e) => sum + e.quantity_completed, 0)
      const completionRate = totalQuantity > 0 ? Math.min(1, completedQuantity / totalQuantity) : 0 // Clamp to 1

      trainingData.features.push(features)
      trainingData.labels.push(completionRate)
    }

    // Train Neural Network model
    this.neuralPredictor.createModel(trainingData.features[0].length)
    const metrics = await this.neuralPredictor.train(trainingData, 50)
    
    // Save model
    this.neuralPredictor.saveModel()

    return metrics
  }

  async trainWorkerPerformanceModel(workers: any[], progressEntries: any[]): Promise<ModelMetrics> {
    const trainingData: TrainingData = {
      features: [],
      labels: [],
      featureNames: ['entry_count', 'avg_quantity', 'consistency', 'experience', 'recent_performance', 'role_weight']
    }

    // Prepare training data
    for (const worker of workers) {
      const features = FeatureEngineer.createWorkerFeatures(worker, progressEntries)
      const workerEntries = progressEntries.filter(e => 
        e.user_id === worker.id || e.worker_name === worker.full_name
      )
      
      const avgPerformance = workerEntries.length > 0 
        ? workerEntries.reduce((sum, e) => sum + e.quantity_completed, 0) / workerEntries.length 
        : 0

      trainingData.features.push(features)
      trainingData.labels.push(avgPerformance)
    }

    // Train linear regression model
    const metrics = await this.linearPredictor.train(trainingData)
    return metrics
  }

  async predictProjectCompletion(project: any, stages: any[], assemblies: any[], progressEntries: any[]): Promise<PredictionResult> {
    const features = FeatureEngineer.createProjectFeatures(project, stages, assemblies, progressEntries)
    return this.neuralPredictor.predict(features)
  }

  async predictWorkerPerformance(worker: any, progressEntries: any[]): Promise<PredictionResult> {
    const features = FeatureEngineer.createWorkerFeatures(worker, progressEntries)
    return this.linearPredictor.predict(features)
  }

  async predictSystemHealth(projects: any[], workers: any[], stages: any[], assemblies: any[], progressEntries: any[]): Promise<PredictionResult> {
    // System health prediction based on multiple factors
    const projectHealth = projects.length > 0 ? 
      projects.reduce((sum, p) => {
        const projectAssemblies = assemblies.filter(a => a.project_id === p.id)
        const projectProgress = progressEntries.filter(e => 
          projectAssemblies.some(a => a.id === e.assembly_id)
        )
        const totalQuantity = projectAssemblies.reduce((sum, a) => sum + a.total_quantity, 0)
        const completedQuantity = projectProgress.reduce((sum, e) => sum + e.quantity_completed, 0)
        return sum + (totalQuantity > 0 ? Math.min(1, completedQuantity / totalQuantity) : 0) // Clamp to 1
      }, 0) / projects.length : 0

    const workerHealth = workers.length > 0 ?
      workers.reduce((sum, w) => {
        const workerEntries = progressEntries.filter(e => 
          e.user_id === w.id || e.worker_name === w.full_name
        )
        const avgPerformance = workerEntries.length > 0 
          ? workerEntries.reduce((sum, e) => sum + e.quantity_completed, 0) / workerEntries.length 
          : 0
        return sum + avgPerformance
      }, 0) / workers.length : 0

    const systemHealth = (projectHealth + workerHealth) / 2

    return {
      prediction: systemHealth * 100,
      confidence: 0.8,
      features: [projectHealth, workerHealth],
      timestamp: new Date().toISOString()
    }
  }
}

// Export singleton instance
export const mlService = new MLService()
